const MAPS2 = (() => {
  const SPACE = { Exterior: 'Open', Entry: 'Narrow', Hallway: 'Narrow', Stairs: 'Narrow', Rotation: 'Connector', Power: 'Open', Site: 'Fortified' };
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const centre = poly => {
    const xs = poly.map(p => p[0]);
    const ys = poly.map(p => p[1]);
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  };
  const room = (label, type, poly, anchor = centre(poly)) => ({ label, type, space: SPACE[type], poly, anchor });

  return {
    'Meridian Office Tower': {
      size: [800, 520],
      spawns: ['ext-s', 'ext-w', 'ext-e'],
      site: 'site',
      zones: {
        'ext-s':    room('Main street', 'Exterior', rect(0, 460, 800, 520)),
        'ext-w':    room('Fire escape', 'Exterior', rect(0, 60, 60, 460)),
        'ext-e':    room('Service alley', 'Exterior', rect(740, 60, 800, 460)),
        'archives': room('Archive stacks', 'Hallway', rect(60, 60, 200, 200)),
        'break':    room('Break room', 'Rotation', rect(60, 200, 200, 340)),
        'stairs':   room('Fire stairs', 'Stairs', rect(60, 340, 200, 460)),
        'hall-w':   room('West corridor', 'Hallway', rect(200, 60, 250, 460)),
        'glass':    room('Glass conference', 'Rotation', rect(250, 60, 330, 200)),
        'site':     room('Executive boardroom', 'Site', rect(330, 60, 550, 200)),
        'hall-n':   room('North corridor', 'Hallway', rect(250, 200, 550, 250)),
        'open':     room('Open office floor', 'Power', rect(250, 250, 550, 340)),
        'lobby':    room('Main lobby', 'Entry', rect(250, 340, 550, 460)),
        'hall-e':   room('East corridor', 'Hallway', rect(550, 60, 600, 460)),
        'exec':     room('Corner office', 'Power', rect(600, 60, 740, 200)),
        'vent':     room('Vent shaft', 'Entry', rect(600, 200, 740, 340)),
        'mail':     room('Mail room', 'Entry', rect(600, 340, 740, 460)),
      },
      edges: [
        ['ext-s', 'lobby'], ['ext-w', 'stairs'], ['ext-e', 'mail'], ['ext-e', 'vent'],
        ['lobby', 'open'], ['lobby', 'hall-w'], ['stairs', 'hall-w'], ['stairs', 'break'],
        ['break', 'hall-w'], ['break', 'archives'], ['archives', 'hall-w'], ['hall-w', 'glass'],
        ['hall-w', 'hall-n'], ['hall-w', 'open'], ['open', 'hall-n'], ['open', 'hall-e'],
        ['hall-n', 'glass'], ['hall-n', 'site'], ['hall-n', 'hall-e'], ['glass', 'site'],
        ['hall-e', 'site'], ['hall-e', 'exec'], ['hall-e', 'vent'], ['hall-e', 'mail'],
        ['vent', 'exec'], ['vent', 'mail'],
      ],
      doors: [
        ['ext-s', 'lobby', [400, 460]], ['ext-w', 'stairs', [60, 400]], ['ext-e', 'mail', [740, 400]], ['ext-e', 'vent', [740, 270]],
        ['lobby', 'open', [400, 340]], ['lobby', 'hall-w', [250, 400]], ['stairs', 'hall-w', [200, 400]], ['stairs', 'break', [130, 340]],
        ['break', 'hall-w', [200, 270]], ['break', 'archives', [130, 200]], ['archives', 'hall-w', [200, 130]], ['hall-w', 'glass', [250, 130]],
        ['hall-w', 'hall-n', [250, 225]], ['hall-w', 'open', [250, 295]], ['open', 'hall-n', [400, 250]], ['open', 'hall-e', [550, 295]],
        ['hall-n', 'glass', [290, 200]], ['hall-n', 'site', [440, 200]], ['hall-n', 'hall-e', [550, 225]], ['glass', 'site', [330, 130]],
        ['hall-e', 'site', [550, 130]], ['hall-e', 'exec', [600, 130]], ['hall-e', 'vent', [600, 270]], ['hall-e', 'mail', [600, 400]],
        ['vent', 'exec', [670, 200]], ['vent', 'mail', [670, 340]],
      ],
    },

    'St. Mora Hospital': {
      size: [800, 520],
      spawns: ['ext-s', 'ext-w', 'ext-n'],
      site: 'site',
      zones: {
        'ext-n':     room('Garden courtyard', 'Exterior', rect(60, 0, 740, 60)),
        'ext-w':     room('Service yard', 'Exterior', rect(0, 60, 60, 460)),
        'ext-s':     room('Ambulance bay', 'Exterior', rect(0, 460, 800, 520)),
        'gate':      room('Tunnel entrance', 'Entry', rect(60, 330, 170, 460)),
        'tunnel':    room('Service tunnel', 'Hallway', rect(60, 60, 170, 330)),
        'stairs':    room('Stairwell', 'Stairs', rect(170, 60, 230, 460)),
        'window':    room('Ward window', 'Entry', rect(230, 60, 350, 160)),
        'ward':      room('North ward', 'Hallway', rect(350, 60, 650, 160)),
        'pharmacy':  room('Pharmacy', 'Power', rect(650, 60, 740, 160)),
        'hall':      room('Ward corridor', 'Hallway', rect(230, 160, 740, 210)),
        'reception': room('Reception', 'Power', rect(230, 210, 470, 380)),
        'entrance':  room('Main entrance', 'Entry', rect(230, 380, 470, 460)),
        'lift':      room('Lift lobby', 'Rotation', rect(470, 210, 530, 460)),
        'site':      room('Operating theatre', 'Site', rect(530, 210, 740, 330)),
        'scrub':     room('Scrub room', 'Rotation', rect(530, 330, 640, 460)),
        'ambulance': room('Ambulance doors', 'Entry', rect(640, 330, 740, 460)),
      },
      edges: [
        ['ext-w', 'gate'], ['ext-s', 'entrance'], ['ext-s', 'ambulance'], ['ext-n', 'window'],
        ['gate', 'tunnel'], ['tunnel', 'stairs'], ['stairs', 'window'], ['stairs', 'hall'],
        ['stairs', 'reception'], ['window', 'ward'], ['window', 'hall'], ['ward', 'hall'],
        ['ward', 'pharmacy'], ['pharmacy', 'hall'], ['hall', 'site'], ['hall', 'lift'],
        ['hall', 'reception'], ['entrance', 'reception'], ['reception', 'lift'], ['entrance', 'lift'],
        ['lift', 'site'], ['lift', 'scrub'], ['scrub', 'site'], ['scrub', 'ambulance'],
      ],
      doors: [
        ['ext-w', 'gate', [60, 395]], ['ext-s', 'entrance', [350, 460]], ['ext-s', 'ambulance', [690, 460]], ['ext-n', 'window', [290, 60]],
        ['gate', 'tunnel', [115, 330]], ['tunnel', 'stairs', [170, 195]], ['stairs', 'window', [230, 110]], ['stairs', 'hall', [230, 185]],
        ['stairs', 'reception', [230, 295]], ['window', 'ward', [350, 110]], ['window', 'hall', [290, 160]], ['ward', 'hall', [500, 160]],
        ['ward', 'pharmacy', [650, 110]], ['pharmacy', 'hall', [695, 160]], ['hall', 'site', [635, 210]], ['hall', 'lift', [500, 210]],
        ['hall', 'reception', [350, 210]], ['entrance', 'reception', [350, 380]], ['reception', 'lift', [470, 295]], ['entrance', 'lift', [470, 420]],
        ['lift', 'site', [530, 270]], ['lift', 'scrub', [530, 395]], ['scrub', 'site', [585, 330]], ['scrub', 'ambulance', [640, 395]],
      ],
    },

    'Ironfield Factory': {
      size: [800, 520],
      spawns: ['ext-e', 'ext-s'],
      site: 'site',
      zones: {
        'ext-e':    room('Truck yard', 'Exterior', rect(740, 60, 800, 460)),
        'ext-s':    room('Rail siding', 'Exterior', rect(0, 460, 800, 520)),
        'site':     room('Control room', 'Site', rect(60, 60, 200, 260)),
        'gantry':   room('Gantry', 'Power', rect(200, 60, 300, 130)),
        'catwalk':  room('Catwalk', 'Rotation', rect(300, 60, 620, 130)),
        'ladder':   room('Catwalk ladder', 'Stairs', rect(620, 60, 740, 200)),
        'boiler':   room('Boiler room', 'Hallway', rect(200, 130, 300, 360)),
        'floor':    room('Factory floor', 'Power', [[300, 130], [620, 130], [620, 200], [540, 200], [540, 360], [300, 360]], [420, 245]),
        'press':    room('Press line', 'Entry', rect(540, 200, 740, 360)),
        'locker':   room('Locker room', 'Rotation', rect(60, 260, 200, 360)),
        'pipes':    room('Pipe gallery', 'Hallway', rect(60, 360, 200, 460)),
        'rail':     room('Rail door', 'Entry', rect(200, 360, 300, 460)),
        'assembly': room('Assembly line', 'Hallway', rect(300, 360, 460, 460)),
        'forklift': room('Forklift lane', 'Rotation', rect(460, 360, 540, 460)),
        'bay':      room('Loading bay', 'Entry', rect(540, 360, 740, 460)),
      },
      edges: [
        ['ext-e', 'ladder'], ['ext-e', 'press'], ['ext-e', 'bay'], ['ext-s', 'bay'], ['ext-s', 'rail'],
        ['ladder', 'catwalk'], ['ladder', 'press'], ['catwalk', 'gantry'], ['catwalk', 'floor'],
        ['gantry', 'site'], ['gantry', 'boiler'], ['boiler', 'site'], ['boiler', 'floor'],
        ['boiler', 'locker'], ['boiler', 'rail'], ['locker', 'site'], ['locker', 'pipes'],
        ['pipes', 'rail'], ['floor', 'press'], ['floor', 'assembly'], ['floor', 'forklift'],
        ['assembly', 'rail'], ['assembly', 'forklift'], ['forklift', 'bay'], ['press', 'bay'],
      ],
      doors: [
        ['ext-e', 'ladder', [740, 130]], ['ext-e', 'press', [740, 280]], ['ext-e', 'bay', [740, 410]], ['ext-s', 'bay', [640, 460]],
        ['ext-s', 'rail', [250, 460]], ['ladder', 'catwalk', [620, 95]], ['ladder', 'press', [680, 200]], ['catwalk', 'gantry', [300, 95]],
        ['catwalk', 'floor', [460, 130]], ['gantry', 'site', [200, 95]], ['gantry', 'boiler', [250, 130]], ['boiler', 'site', [200, 195]],
        ['boiler', 'floor', [300, 245]], ['boiler', 'locker', [200, 310]], ['boiler', 'rail', [250, 360]], ['locker', 'site', [130, 260]],
        ['locker', 'pipes', [130, 360]], ['pipes', 'rail', [200, 410]], ['floor', 'press', [540, 280]], ['floor', 'assembly', [380, 360]],
        ['floor', 'forklift', [500, 360]], ['assembly', 'rail', [300, 410]], ['assembly', 'forklift', [460, 410]], ['forklift', 'bay', [540, 410]],
        ['press', 'bay', [640, 360]],
      ],
    },
  };
})();

if (typeof module === 'object') module.exports = MAPS2;
