(() => {
  const base = new URL('../demo/', document.currentScript.src);
  for (const images of Object.values(CATALOG.PORTRAITS)) {
    images.forEach((source, i) => { images[i] = new URL(source, base).href; });
  }
  for (const [id, source] of Object.entries(CATALOG.ASSETS.weapons)) {
    CATALOG.ASSETS.weapons[id] = new URL(source, base).href;
  }
})();
