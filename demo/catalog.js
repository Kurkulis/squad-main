const CATALOG = (() => {
  const mods = (sh, aw, tw, ut, dc, lk) => ({ sh, aw, tw, ut, dc, lk });
  const WEAPON_CATALOG = [
    { id: 'smg-vector', name: 'Vector .45',     class: 'SMG',     mods: mods(+4, -2,  0,  0, -2,  0) },
    { id: 'smg-mp5',    name: 'MP5 SD',         class: 'SMG',     mods: mods(-2, +3, +1,  0, -1,  0) },
    { id: 'smg-p90',    name: 'P90',            class: 'SMG',     mods: mods(+1, -2, +2, +1, -2,  0) },
    { id: 'ar-m4',      name: 'M4 Carbine',     class: 'AR',      mods: mods(+1, -1, -2,  0, +2,  0) },
    { id: 'ar-ak',      name: 'AK-12',          class: 'AR',      mods: mods(+3, -2,  0, -2,  0, +1) },
    { id: 'ar-aug',     name: 'AUG Optic',      class: 'AR',      mods: mods(-1, +2,  0,  0, +1, -1) },
    { id: 'dmr-sr25',   name: 'SR-25',          class: 'DMR',     mods: mods(+3, -2, -2,  0, +1,  0) },
    { id: 'dmr-mk14',   name: 'Mk14 EBR',       class: 'DMR',     mods: mods(-1, +3,  0, -2, +1,  0) },
    { id: 'dmr-svd',    name: 'SVD',            class: 'DMR',     mods: mods(+4,  0, -3,  0, -3, +2) },
    { id: 'sg-m870',    name: 'M870 Pump',      class: 'Shotgun', mods: mods(+3, -1,  0, -1, -2, +1) },
    { id: 'sg-spas',    name: 'SPAS-12',        class: 'Shotgun', mods: mods(+1, -2,  0, +3, -2,  0) },
    { id: 'sg-saiga',   name: 'Saiga-12',       class: 'Shotgun', mods: mods(+4, -2, +1,  0, -3,  0) },
    { id: 'pistol-m9',  name: 'M9',             class: 'Pistol',  mods: mods( 0,  0,  0,  0, +1,  0) },
    { id: 'pistol-de',  name: 'Desert Eagle',   class: 'Pistol',  mods: mods(+2, -1,  0,  0,  0,  0) },
  ];
  const ATTACK = ['SMG', 'Shotgun', 'AR'];
  const SUPPORT = ['AR', 'SMG'];
  const HOLD = ['DMR', 'AR', 'SMG'];
  const ROLE_CLASSES = {
    'Entry': ATTACK, 'Second Entry': ATTACK, 'Roamer': ATTACK,
    'Support': SUPPORT, 'Utility Specialist': SUPPORT, 'Flex': SUPPORT, 'Support Defender': SUPPORT, 'Trap Specialist': [...SUPPORT, 'Shotgun'],
    'Anchor': HOLD, 'Lurker': HOLD,
  };
  const weapon = id => WEAPON_CATALOG.find(w => w.id === id);
  const ofClass = cls => WEAPON_CATALOG.filter(w => w.class === cls);
  const allowed = role => ROLE_CLASSES[role].flatMap(ofClass);
  const gun = file => `placeholders/guns/${file}`;
  const ASSETS = {
    weapons: {
      'smg-vector': gun('Vector_.45_ACP.avif'), 'smg-mp5': gun('MP5.avif'), 'smg-p90': gun('P90.avif'),
      'ar-m4': gun('M4.avif'), 'ar-ak': gun('AK-12.avif'), 'ar-aug': gun('AUG_A2.avif'),
      'dmr-sr25': gun('SR-25.avif'), 'dmr-mk14': gun('Mk_14_EBR.avif'), 'dmr-svd': gun('SR-25.avif'),
      'sg-m870': gun('pump.png'), 'sg-spas': gun('SPAS-12.avif'), 'sg-saiga': gun('SAIGA.avif'),
      'pistol-m9': gun('M45_MEUSOC.avif'), 'pistol-de': gun('D-50.avif'),
    },
  };
  const face = name => `placeholders/operators/r6s-operators-list-${name}.avif`;
  const PORTRAITS = {
    'Entry': [face('ram'), face('striker')], 'Second Entry': [face('brava')], 'Support': [face('sentry')],
    'Utility Specialist': [face('rauora')], 'Flex': [face('solidsnake')],
    'Anchor': [face('tubarao'), face('skopos')], 'Roamer': [face('denari__2_')], 'Lurker': [face('deimos')],
    'Trap Specialist': [face('fenrir')], 'Support Defender': [face('noor')],
  };
  const portraitFor = (role, index = 0) => PORTRAITS[role][index % PORTRAITS[role].length];
  const weaponImage = w => ASSETS.weapons[w?.id] ?? ASSETS.weapons[ofClass(w?.class)[0]?.id];
  return { WEAPON_CATALOG, ROLE_CLASSES, ASSETS, PORTRAITS, weapon, ofClass, allowed, portraitFor, weaponImage };
})();

if (typeof module === 'object') module.exports = CATALOG;
