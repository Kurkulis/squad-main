import argparse
import functools
import json
import shutil
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--screenshots-dir", type=Path)
args = parser.parse_args()
if args.screenshots_dir:
    args.screenshots_dir.mkdir(parents=True, exist_ok=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(
    ("127.0.0.1", 0),
    functools.partial(QuietHandler, directory=str(ROOT)),
)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{server.server_port}/astraWork/"

try:
    with sync_playwright() as p, tempfile.TemporaryDirectory(prefix="astra-smoke-") as tmp:
        chromium = shutil.which("chromium") or shutil.which("chromium-browser")
        launch = {"headless": True, "args": ["--no-sandbox"]}
        if chromium:
            launch["executable_path"] = chromium
        browser = p.chromium.launch(**launch)
        page = browser.new_page(viewport={"width": 1440, "height": 1050})
        errors, failures = [], []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("requestfailed", lambda request: failures.append(request.url))
        page.on(
            "response",
            lambda response: failures.append(f"{response.status} {response.url}")
            if response.status >= 400 and not response.url.endswith("/favicon.ico")
            else None,
        )
        page.goto(url, wait_until="networkidle")
        page.evaluate("localStorage.setItem('squadsim.ladder.v1', 'preserve-original-save')")
        names = page.locator("#map-cards > button").evaluate_all(
            "(buttons) => buttons.map(button => button.dataset.map)"
        )
        assert len(names) == 4
        for index, name in enumerate(names):
            page.locator("#map-cards > button").nth(index).click()
            page.locator("#show-plans").check()
            assert page.locator("#map-title").inner_text() == name
            zone = page.evaluate(
                """name => Object.entries(ASTRA_MAPS[name].zones)
                    .find(([id, zone]) => !['Exterior', 'Site'].includes(zone.type))
                    .map(value => typeof value === 'object' ? value.label : value)""",
                name,
            )
            target = page.locator(f'#map-view .zone[data-zone="{zone[0]}"]')
            target.focus()
            target.press("Enter")
            assert page.locator("#inspector h3").inner_text() == zone[1]
            if args.screenshots_dir:
                page.locator(".workspace").screenshot(
                    path=str(args.screenshots_dir / f"map-{index + 1}.png")
                )
            page.locator("#play-round").click()
            page.locator("#pb-skip").click()
            assert "wins" in page.locator("#round-result").inner_text()
            print(name + ": " + page.locator("#round-result").inner_text())
        for index in range(6):
            page.locator("[data-lesson]").nth(index).click()
            assert page.locator("#attack-plan").is_disabled()
            page.locator("#play-round").click()
            page.locator("#pb-skip").click()
            assert "wins" in page.locator("#round-result").inner_text()
        with page.expect_download() as download:
            page.locator("#export-map").click()
        target = Path(tmp) / "export.json"
        download.value.save_as(target)
        exported = json.loads(target.read_text())
        assert exported["name"] == "Astra Training House"
        assert len(exported["map"]["zones"]) == 8
        assert page.evaluate("localStorage.getItem('squadsim.ladder.v1')") == "preserve-original-save"
        page.set_viewport_size({"width": 390, "height": 844})
        page.locator("#map-cards > button").nth(1).click()
        assert page.locator("#attack-plan").is_enabled()
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), "mobile page overflow"
        assert page.locator("#map-view").evaluate("el => el.scrollWidth > el.clientWidth"), "mobile map stays readable in its scroll area"
        if args.screenshots_dir:
            page.screenshot(path=str(args.screenshots_dir / "mobile.png"), full_page=True)
        assert not errors, errors
        assert not failures, failures
        local = browser.new_page()
        local.on("pageerror", lambda error: errors.append(str(error)))
        local_supported = True
        try:
            local.goto((ROOT / "astraWork/index.html").as_uri(), wait_until="load")
        except PlaywrightError as error:
            if "ERR_BLOCKED_BY_ADMINISTRATOR" not in str(error):
                raise
            local_supported = False
            print("SKIP file://: this browser's administrator policy blocks local-file navigation. HTTP checks passed.")
        if local_supported:
            assert local.locator("#map-cards > button").count() == 4
            local.locator("#play-round").click()
            local.locator("#pb-skip").click()
            assert "wins" in local.locator("#round-result").inner_text()
            print("PASS: file:// round replay.")
        assert not errors, errors
        browser.close()
        print("PASS: HTTP, four maps, six tutorial presets, keyboard room selection, JSON export, isolated saves, and mobile bounds.")
finally:
    server.shutdown()
    server.server_close()
