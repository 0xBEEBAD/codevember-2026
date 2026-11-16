export function randomSeed(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hash(x, y, z) {
  let h = Math.imul(x, 1597334677) ^ Math.imul(y, 3812015801) ^ Math.imul(z, 2798796415);
  h = Math.imul(h ^ h >>> 16, 2246822519);
  return ((h ^ h >>> 13) >>> 0) / 4294967295;
}
export function noise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let a = x - ix, b = y - iy, c = z - iz;
  a = a * a * (3 - 2 * a); b = b * b * (3 - 2 * b); c = c * c * (3 - 2 * c);
  const mix = (p, q, t) => p + (q - p) * t;
  return mix(mix(mix(hash(ix, iy, iz), hash(ix + 1, iy, iz), a), mix(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), a), b), mix(mix(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), a), mix(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), a), b), c) * 2 - 1;
}
export function fbm(x, y, z, octaves = 4) {
  let v = 0, a = .5;
  for (let i = 0; i < octaves; i++) { v += noise(x, y, z) * a; x = x * 2.03 + 13.1; y = y * 2.03 + 7.7; z = z * 2.03 + 5.3; a *= .5; }
  return v;
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Broad connected mountain chains, separated by dry plains. Values are in
// metres; the furthest chain is almost 180 km beyond the sanctuary.
export const mountainRanges = [
  [-4000, -6500, 5000, 4200, 1400],
  [5200, -10400, 6200, 5000, 1700],
  [-13000, -23000, 7500, 14000, 2100],
  [18000, -39000, 11000, 20000, 3200],
  [-38000, -68000, 17000, 26000, 4400],
  [4000, -95000, 18000, 22000, 3900],
  [53000, -122000, 24000, 32000, 5200],
  [-69000, -154000, 31000, 29000, 5800],
  [0, -179000, 35000, 23000, 4800]
];

// Triangular-lattice gradient noise avoids the rectangular ridges produced
// by taking the absolute value of a square-grid value-noise field.
const mountainGradients = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
function mountainNoise(x, z, seed) {
  const skew = (x + z) * .3660254037844386, i = Math.floor(x + skew), j = Math.floor(z + skew);
  const unskew = (i + j) * .21132486540518713, dx = x - i + unskew, dz = z - j + unskew;
  const ix = dx > dz ? 1 : 0, iz = 1 - ix;
  function corner(a, b, u, v) {
    const falloff = .5 - u * u - v * v;
    if (falloff <= 0) return 0;
    const g = mountainGradients[Math.min(7, Math.floor(hash(a, seed, b) * 8))];
    return falloff ** 4 * (g[0] * u + g[1] * v);
  }
  return clamp(70 * (corner(i, j, dx, dz)
    + corner(i + ix, j + iz, dx - ix + .21132486540518713, dz - iz + .21132486540518713)
    + corner(i + 1, j + 1, dx - .5773502691896257, dz - .5773502691896257)), -1, 1);
}
function mountainHeight(x, z) {
  if (z > -1800) return 0;
  let envelope = 0;
  for (const [cx, cz, rx, rz, height] of mountainRanges) {
    const dx = (x - cx) / rx, dz = (z - cz) / rz;
    envelope = Math.max(envelope, Math.exp(-(dx * dx + dz * dz) * 2.8) * height);
  }
  // Each envelope contains several overlapping, sinuous dune crests. The
  // envelope is only their height limit: a broad pedestal made entire ranges
  // read as single hemispheres from the basin.
  const wx = x + mountainNoise(x * .00012, z * .00012, 9) * 1300;
  const wz = z + mountainNoise(x * .00011, z * .00011, 31) * 1100;
  const radius = Math.hypot(x, z), detail = 1 - smoothstep(18000, 50000, radius);
  // Expand the wavelength with the mesh spacing. Small distant folds must
  // disappear before they can alias into the old serrated triangle pattern.
  const frequency = .00048 / (1 + smoothstep(8000, 80000, radius) * 8 + smoothstep(80000, 200000, radius) * 10);
  const nx = wx * frequency, nz = wz * frequency;
  const cycle = nx * .88 + nz * .46 + mountainNoise(nx * .42, nz * .42, 53) * .48;
  function dune(phase, crest) {
    const t = phase - Math.floor(phase);
    // Smooth slopes on both sides of the crest and at the period boundary.
    // A narrow but rounded lee face avoids a cusp between triangle rows.
    return t < crest ? smoothstep(0, crest, t) : 1 - smoothstep(crest, 1, t);
  }
  const primary = dune(cycle, .7);
  const secondary = dune(nx * .67 + nz * .72 + mountainNoise(nx * .56, nz * .56, 67) * .35 + .31, .67);
  const subsidiary = dune(cycle * 1.83 + mountainNoise(nx * .7, nz * .7, 81) * .32 + .65, .64);
  const alongCrest = nx * .48 - nz * .9 + mountainNoise(nx * .48, nz * .48, 97) * .42;
  const crestHeight = .42 + dune(alongCrest, .57) * .58;
  const relief = .035 + primary * crestHeight * .78 + secondary * .2
    + subsidiary * (.45 + primary * .55) * .1 * detail;
  const apron = smoothstep(10, 120, envelope) * (1 - smoothstep(400, 900, envelope));
  const foothills = dune(cycle * 1.4 + .5, .7) * 65 * apron * detail;
  return smoothstep(1800, 6000, -z) * (envelope * relief + foothills);
}

export function terrainHeight(x, z) {
  // Windward ramps climb slowly toward a sinuous crest; the short lee side
  // falls at the angle of repose. Broad wavelengths keep whole dune faces
  // readable at the sanctuary's scale instead of becoming small rolling bumps.
  const warp = noise(x * .0025, 3, z * .003) * 90 + Math.sin(z * .009) * 24;
  // Broader sand seas in the distance stay resolved by the terrain rings;
  // retaining the near basin's 270 m dunes there produced faceted ripples.
  const wavelength = 270 + 730 * smoothstep(1500, 7000, Math.hypot(x, z));
  const cycle = (x + z * .58 + warp) / wavelength;
  const phase = cycle - Math.floor(cycle), crest = .77;
  const ramp = phase < crest ? smoothstep(0, crest, phase) : 1 - smoothstep(crest, 1, phase);
  const dunes = ramp * (32 + 10 * noise(x * .0015, 4, z * .0017));
  const shoulder = smoothstep(canyonWidth(z) - 30, canyonWidth(z) + 16, Math.abs(x - canyonCenter(z)));
  const talus = shoulder * (12 + noise(z * .017, 23, x * .009) * 5);
  const sculpted = dunes + fbm(x * .009, 17, z * .009, 3) * 1.5 - 3.5 + talus;
  // A dry, almost level basin carries the inverted image beneath the city.
  const across = 1 - smoothstep(canyonWidth(z) * .57, canyonWidth(z) * .9, Math.abs(x - canyonCenter(z)));
  const along = smoothstep(-1050, -750, z) * (1 - smoothstep(35, 130, z));
  const basin = across * along;
  const uplands = mountainHeight(x, z);
  const exposedRock = smoothstep(120, 450, uplands);
  return sculpted * (1 - basin) * (1 - exposedRock) + (-1.4 + noise(x * .035, 29, z * .035) * .025) * basin + uplands;
}

export function canyonCenter(z) { return Math.sin(z * .007) * 21 + Math.sin(z * .019) * 5; }
export function canyonWidth(z) { return 150 + Math.max(0, -z) * .09 + Math.exp(-Math.pow((z + 220) / 400, 2)) * 95; }
