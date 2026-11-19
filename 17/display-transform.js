import { Fn, float, mix, vec3 } from 'three/tsl';

// Scene-linear radiance in, linear display values out (renderOutput applies
// the sRGB encoding afterwards):
// - Narkowicz's fit of the ACES filmic curve, per channel;
// - saturation that favours warm hues, so sunlit kelp reaches the chartreuse
//   of the references while the water, already close in hue and saturation,
//   moves less; and contrast pivoting on mid-grey. Both work in display
//   space and are clipped at SDR white, as the 8-bit output used to be;
// - on an HDR display, a highlight shoulder: per channel, d = max(x - 1, 0)
//   adds (peak - 1) (d / (d + 4))^2, approaching the selected peak (the
//   extension day 16 adds to ACES).
// Headroom 1 reproduces the SDR transform exactly, and at any headroom the
// output for scene-linear values up to 1 is unchanged.
export const filmicHDR=Fn(([radiance,saturation,contrast,headroom])=>{
  const mapped=radiance.mul(2.51).add(.03).mul(radiance).div(radiance.mul(2.43).add(.59).mul(radiance).add(.14)).clamp().toVar();
  const luminance=mapped.dot(vec3(.2126,.7152,.0722));
  const warmth=mapped.r.add(mapped.g).mul(.5).sub(mapped.b).div(mapped.r.max(mapped.g).max(mapped.b).max(1e-4)).smoothstep(0,.6);
  const graded=mix(vec3(luminance),mapped,mix(float(1.06),float(1.3),warmth).mul(saturation)).max(0).pow(1.04)
    .div(.18).pow(contrast).mul(.18);
  const shoulder=radiance.sub(1).max(0).toVar();
  const extension=shoulder.div(shoulder.add(4)).pow2().mul(headroom.sub(1));
  return graded.min(1).add(extension).min(headroom);
});
