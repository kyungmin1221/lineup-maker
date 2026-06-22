export const C = {
  bg:          '#0B1120',
  surface:     '#131C2E',
  raised:      '#1A2540',
  border:      'rgba(255,255,255,0.07)',
  borderMid:   'rgba(255,255,255,0.12)',
  blue:        '#2563EB',
  blueBright:  '#3B82F6',
  blueLight:   '#93C5FD',
  accent:      '#2a71c8',
  accentDark:  '#8b95a2',
  accentInk:   '#FFFFFF',
  accentSoft:  '#2a71c8',
  text:        '#EBF1FF',
  sub:         '#8BA0BE',
  muted:       '#3D5270',
  pitchDark:   '#1B5229',
  pitchLight:  '#206030',
  pitchLine:   'rgba(255,255,255,0.35)',
};

let _uid = 100;
export const nextId = () => String(++_uid);

export const STARTER_SQUAD = [
  { id: '1',  name: '유상엽', number: '1'  },
  { id: '2',  name: '이주호', number: '2'  },
  { id: '3',  name: '김태용', number: '3'  },
  { id: '4',  name: '김응록', number: '4'  },
  { id: '5',  name: '김다운', number: '5'  },
  { id: '6',  name: '박세윤', number: '6'  },
  { id: '7',  name: '박경민', number: '7'  },
  { id: '8',  name: '엄태성', number: '8'  },
  { id: '9',  name: '이지우', number: '9'  },
  { id: '10', name: '박준영', number: '10' },
  { id: '11', name: '이재광', number: '11' },
  { id: '12', name: '제현동', number: '12' },
  { id: '13', name: '박주현', number: '13' },
  { id: '14', name: '이정후', number: '14' },
  { id: '15', name: '최민준', number: '15' },
];

export const STARTER_LAYOUT = [
  { playerId: '1',  x: 50, y: 90 },
  { playerId: '2',  x: 18, y: 76 },
  { playerId: '3',  x: 38, y: 80 },
  { playerId: '4',  x: 62, y: 80 },
  { playerId: '5',  x: 82, y: 76 },
  { playerId: '6',  x: 30, y: 56 },
  { playerId: '7',  x: 50, y: 60 },
  { playerId: '8',  x: 70, y: 56 },
  { playerId: '9',  x: 25, y: 30 },
  { playerId: '10', x: 50, y: 22 },
  { playerId: '11', x: 75, y: 30 },
];

export function makeQuarter(label, players = []) {
  return { id: nextId(), label, players, comments: [] };
}
