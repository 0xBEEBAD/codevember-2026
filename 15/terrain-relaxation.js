// Relax over-steep deposits into their neighbouring slopes. Operating on the
// heightfield (rather than adding fragment noise) changes both the silhouette
// and the terrain the rover collides with.
export function relaxTerrain(source, size, stepX, stepZ, iterations = 48) {
  let height = new Float32Array(source), next = new Float32Array(source.length);
  const neighbours = [];
  for (let z = -1; z <= 1; z++) for (let x = -1; x <= 1; x++) {
    if (x || z) neighbours.push({ offset: z * size + x, limit: Math.hypot(x * stepX, z * stepZ) * .58 });
  }
  const excess = new Float64Array(8);
  for (let pass = 0; pass < iterations; pass++) {
    next.set(height);
    for (let z = 1; z < size - 1; z++) for (let x = 1; x < size - 1; x++) {
      const i = z * size + x, h = height[i];
      let sum = 0, maximum = 0;
      for (let k = 0; k < 8; k++) {
        const n = neighbours[k], amount = Math.max(0, h - height[i + n.offset] - n.limit);
        excess[k] = amount; sum += amount; maximum = Math.max(maximum, amount);
      }
      if (sum === 0) continue;
      const transfer = maximum * .42;
      next[i] -= transfer;
      for (let k = 0; k < 8; k++) next[i + neighbours[k].offset] += transfer * excess[k] / sum;
    }
    [height, next] = [next, height];
  }
  // A small reconstruction filter removes isolated one-cell extrema without
  // rounding entire mountains. Bicubic sampling below then has C1 continuity.
  next.set(height);
  for (let z = 1; z < size - 1; z++) for (let x = 1; x < size - 1; x++) {
    const i = z * size + x;
    next[i] = height[i] * .5 + (height[i - 1] + height[i + 1] + height[i - size] + height[i + size]) * .125;
  }
  return next;
}

const cubic = (a, b, c, d, t) => b + .5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
export function sampleTerrain(height, size, x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), tx = x - ix, tz = z - iz;
  const row = offset => {
    const j = Math.max(0, Math.min(size - 1, iz + offset)) * size;
    const at = offsetX => height[j + Math.max(0, Math.min(size - 1, ix + offsetX))];
    return cubic(at(-1), at(0), at(1), at(2), tx);
  };
  return cubic(row(-1), row(0), row(1), row(2), tz);
}
