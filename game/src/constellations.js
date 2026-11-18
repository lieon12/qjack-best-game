// The six constellations the Shepherd must relight, in order. Each one is a name and the
// stars that draw it, as fractions of the playfield (0..1), so the shapes hold at any size.
// A star's number is its order in the list: the player collects them 1, 2, 3, ...

export const CONSTELLATIONS = [
  {
    name: 'The Kite',
    stars: [
      [0.5, 0.16],
      [0.63, 0.4],
      [0.5, 0.64],
      [0.37, 0.4],
    ],
  },
  {
    name: 'The Crown',
    stars: [
      [0.25, 0.55],
      [0.32, 0.3],
      [0.5, 0.18],
      [0.68, 0.3],
      [0.75, 0.55],
    ],
  },
  {
    name: 'The Sail',
    stars: [
      [0.35, 0.62],
      [0.4, 0.38],
      [0.48, 0.2],
      [0.6, 0.34],
      [0.66, 0.55],
      [0.52, 0.68],
    ],
  },
  {
    name: 'The Fox',
    stars: [
      [0.3, 0.35],
      [0.45, 0.22],
      [0.62, 0.3],
      [0.7, 0.48],
      [0.55, 0.62],
      [0.38, 0.58],
    ],
  },
  {
    name: 'The Harp',
    stars: [
      [0.28, 0.58],
      [0.36, 0.34],
      [0.46, 0.18],
      [0.58, 0.3],
      [0.66, 0.52],
      [0.74, 0.3],
    ],
  },
  {
    name: 'The Phoenix',
    stars: [
      [0.25, 0.6],
      [0.33, 0.38],
      [0.44, 0.22],
      [0.58, 0.3],
      [0.68, 0.48],
      [0.55, 0.66],
      [0.4, 0.52],
    ],
  },
];

/** Bonus for finishing a constellation, by its index (0-based): 100, 150, 200, ... */
export function constellationBonus(index) {
  return 100 + 50 * index;
}
