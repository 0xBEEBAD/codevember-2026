export const FPS = 30;
export const SIZE = 1024;
export const DURATION = 60;
export const RENDER_SIZE = 1536;
export const PARTICLES = 1310720;

// Distances and elevations are relative to each shot's moving focus point.
// The ten-second arrival is followed by five clean editorial cuts.
export const SHOTS = [
  { start: 0, end: 10, name: 'Arrival — low, wide orbit into the grove', target: [[0,.88,0],[0,.93,0]], distance: [10.5,8.6], elevation: [-2.5,-3.5], azimuth: [.44,-.12], fov: 38 },
  { start: 10, end: 19, name: 'Moss — luminous forest floor', target: [[1.80,.13,.88],[1.80,.13,.82]], distance: [.40,.36], elevation: [12,12], azimuth: [1.20,1.20], fov: 43 },
  { start: 19, end: 30, name: 'Cap edge — spores in backlight', target: [[-.48,1.55,.36],[-.54,1.57,.37]], distance: [.95,.85], elevation: [-12,-9], azimuth: [.45,.18], fov: 47 },
  { start: 30, end: 42, name: 'Amber rim — extreme close-up pullback', target: [[-.40,1.56,.38],[-.35,.95,0]], distance: [.22,7.1], elevation: [-12,3], azimuth: [.50,.48], fov: 38 },
  { start: 42, end: 51, name: 'Above the grove — coral caps and green moss', target: [[0,.65,0],[0,.65,0]], distance: [4.9,4.4], elevation: [43,51], azimuth: [.65,1.02], fov: 42 },
  { start: 51, end: 60, name: 'Farewell — drifting through the light', target: [[0,.93,0],[0,.90,0]], distance: [5.4,6.2], elevation: [8,6], azimuth: [-.7,-.38], fov: 38 },
].map(shot => ({ ...shot, startFrame: shot.start * FPS, endFrame: shot.end * FPS }));

const lerp = (a,b,t) => a+(b-a)*t;

export function cameraPoseAt(time) {
  if (!Number.isFinite(time) || time < 0 || time > DURATION) throw new RangeError('Invalid sequence time');
  const shot = SHOTS.find(s => time < s.end) ?? SHOTS.at(-1);
  const t = (time-shot.start)/(shot.end-shot.start);
  const target = shot.target[0].map((v,i) => lerp(v,shot.target[1][i],t));
  const distance = lerp(...shot.distance,t), elevation = lerp(...shot.elevation,t)*Math.PI/180;
  const azimuth = lerp(...shot.azimuth,t), radius = distance*Math.cos(elevation);
  return { shot, target, distance, fov: shot.fov, position: [
    target[0]+Math.sin(azimuth)*radius,
    target[1]+Math.sin(elevation)*distance,
    target[2]+Math.cos(azimuth)*radius,
  ] };
}

export function setCaptureCamera(app,time) {
  const pose = cameraPoseAt(time), { camera,controls,spores,renderer } = app;
  controls.target.fromArray(pose.target);
  camera.position.fromArray(pose.position);
  camera.fov=pose.fov;camera.updateProjectionMatrix();camera.lookAt(controls.target);camera.updateMatrixWorld();
  // The point rasterizer uses the actual lens and drawing-buffer height.
  spores.pixelWorld.value=2*Math.tan(camera.fov*Math.PI/360)*4.7/renderer.domElement.height;
  return pose;
}
