export const FPS = 30, SIZE = 1024, DURATION = 60;
export const opening = {
  position: [-8.30445671, 1.17500556, 141.80295944],
  rotation: [.031036027, .116930626, -.088466167, -.988705099],
  velocity: [0, 0, 0], angular: [0, 0, 0], steering: 0, distance: 0, spins: [0, 0, 0, 0]
};
// Distances are metres; cameras are offsets from the physical chassis.
// The last two cameras face away from the doorway's projected seal.
export const shots = [
  { name: 'Departure', duration: 6, start: 'opening', goal: [24, 45], throttle: .85, gameCamera: true,
    orbit: [0, -.65], radius: [6.5, 18], height: [2.15, 6], aim: [1.1, 2] },
  { name: 'Sandstone passage', duration: 6, start: [48, 103.5], goal: [78, 70], route: [[52, 94], [60, 89], [70, 84], [78, 70]], throttle: .40,
    orbit: [-1.1, -.45], radius: [14, 16], height: [3.8, 4.6], aim: [1.4, 1.8] },
  { name: 'Wind-carved spires', duration: 4, start: [160, 140], goal: [160, 40], throttle: 0, rockTarget: [48, 7, 68],
    orbit: [-.9, .1], radius: [28, 24], height: [7, 9], aim: [0, 0] },
  { name: 'Dune traverse', duration: 6, start: [85, -35], goal: [70, -160], throttle: .85, transition: 'Sunset',
    orbit: [.25, -.3], radius: [20, 26], height: [5, 7], aim: [3, 4] },
  { name: 'Across the mirage', duration: 5, start: [63, -128], goal: [0, -180], throttle: .7, timeOfDay: 'Dawn',
    orbit: [-2.5, -3.2], radius: [11, 9], height: [.7, .8], aim: [1.4, 1.5], lowCamera: true },
  { name: 'Tires in the sand', duration: 5, start: [0, -78], goal: [0, -160], throttle: .55, wheelCamera: true,
    orbit: [0, 0], radius: [1, 1], height: [1, 1], aim: [1, 1] },
  { name: 'Sandstone detail', duration: 4, start: [0, -70], goal: [0, -170], throttle: 0, rockTarget: [48, 6, 68],
    orbit: [1.1, 1.65], radius: [18, 16], height: [2, 3], aim: [0, 0] },
  { name: 'The approach', duration: 6, start: [-12, -149], goal: [-12, -240], throttle: .75, timeOfDay: 'Dawn', transition: 'Day', gameCamera: true,
    orbit: [-.65, -.2], radius: [26, 21], height: [7, 6], aim: [8, 9] },
  { name: 'The ascent', duration: 6, start: [-12, -219], goal: [-12, -340], throttle: 1,
    orbit: [-.7, -.95], radius: [26, 31], height: [12, 14], aim: [4, 4], stairs: true },
  { name: 'Above the dunes', duration: 6, start: [-12, -285], goal: [-12, -345], throttle: .65,
    orbit: [2, 2.35], radius: [24, 27], height: [10, 11], aim: [1.5, 2], stairs: true },
  { name: 'The summit', duration: 6, start: [-12, -317], goal: [-12, -328], throttle: .65,
    orbit: [2.5, 3.35], radius: [12, 15], height: [4, 5], aim: [1.4, 2], stairs: true, stop: true, terraceCamera: true }
];
let start = 0;
for (const shot of shots) { shot.startFrame = start; shot.frames = shot.duration * FPS; start += shot.frames; }
if (start !== DURATION * FPS) throw new Error('Shot durations must total sixty seconds');
export const ease = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export const mix = (a, b, t) => a + (b - a) * t;
