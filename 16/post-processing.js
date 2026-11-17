import * as THREE from 'three/webgpu';
import { Fn, Loop, float, mix, mrt, output, pass, perspectiveDepthToViewZ, rtt, screenUV, uniform, uv, vec2, vec3, vec4, velocity } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import { createDiffusion } from './diffusion.js';
import { SporeRasterNode } from './spore-raster.js';
import { createToneMapping } from './tone-mapping.js';
export function createPostProcessing(renderer,scene,camera,spores,materials,displayOutput){
  const useTemporal=renderer.backend.device.limits.maxColorAttachmentBytesPerSample>=32;
  const scenePass=pass(scene,camera,{samples:useTemporal?0:4});
  scenePass.setMRT(mrt({output,scatter:vec4(0),tissue:vec4(0),...(useTemporal?{velocity}:{})}));
  scenePass.getTexture('tissue').type=THREE.UnsignedByteType;
  if(useTemporal)scenePass.getTexture('velocity').format=THREE.RGFormat;
  const beauty=scenePass.getTextureNode('output');
  const focus=spores.focus,aperture=uniform(5),inverseSize=uniform(new THREE.Vector2());
  const depth=scenePass.getTextureNode('depth');
  const depthAt=at=>perspectiveDepthToViewZ(depth.sample(at),camera.near,camera.far).negate();
  const tissue=scenePass.getTextureNode('tissue'),scatter=scenePass.getTextureNode('scatter');
  const diffusion=createDiffusion(scatter,tissue,depthAt,camera);
  const diffused=diffusion.filtered;
  const valid=diffused.a.sub(tissue.a).abs().lessThan(.005);
  const strength=materials.sss.mul(.85).clamp(0,1).mul(valid);
  const transported=beauty.rgb.add(diffused.rgb.sub(scatter.rgb).mul(tissue.rgb).mul(strength)).max(0);
  const lit=rtt(vec4(transported,1),null,null,{depthBuffer:false});
  const temporal=useTemporal?traa(lit,depth,scenePass.getTextureNode('velocity'),camera):null;
  const stable=temporal?temporal.getTextureNode():lit;
  const distance=depthAt(screenUV).sub(focus).abs().sub(.65).max(0);
  const gather=Fn(()=>{
    const at=uv(),z=depthAt(at),coc=z.sub(focus).abs().sub(.65).max(0).smoothstep(0,1.3);
    const total=vec3(0).toVar(),weight=float(0).toVar();
    Loop(24,({i})=>{
      const angle=float(i).mul(2.399963),radius=float(i).add(.5).div(24).sqrt();
      const tap=at.add(vec2(angle.cos(),angle.sin()).mul(radius).mul(coc).mul(aperture).mul(inverseSize));
      const tz=depthAt(tap);
      const w=tz.sub(z).abs().smoothstep(.2,.8).oneMinus();
      total.addAssign(stable.sample(tap).rgb.mul(w));weight.addAssign(w);
    });
    return vec4(total.div(weight.max(.0001)),1);
  });
  const blurred=rtt(gather(),null,null,{resolutionScale:.5,depthBuffer:false});
  const opaque=mix(stable.rgb,blurred.rgb,distance.smoothstep(0,.9));
  const particleScene=new THREE.Scene();particleScene.add(spores.mesh);
  spores.points.visible=false;
  const sporeRaster=new SporeRasterNode(spores,scenePass,camera);
  spores.setDepth(perspectiveDepthToViewZ(depth.sample(screenUV),camera.near,camera.far));
  const particlePass=pass(particleScene,camera,{samples:0,depthBuffer:false});
  // Broad lens footprints tolerate a smaller target. Sharp spore cores still
  // accumulate at the full selected DPR in the compute rasterizer.
  particlePass.setResolutionScale(.5);
  const combined=rtt(vec4(opaque.add(particlePass.getTextureNode('output').rgb).add(sporeRaster),1),null,null,{depthBuffer:false});
  const glow=bloom(combined,.30,.45,.65);
  const vignette=screenUV.sub(.5).length().smoothstep(.3,.78).mul(.30).oneMinus();
  const pipeline=new THREE.RenderPipeline(renderer);
  const tone=createToneMapping();
  // Grade and map once, after light transport, bloom, and particle composition.
  // RenderPipeline then applies the sRGB transfer function, including values > 1.
  const radiance=combined.rgb.add(glow.rgb).mul(vignette);
  pipeline.outputNode=vec4(tone.apply(radiance),1);
  return {pipeline,scenePass,particlePass,particleScene,sporeRaster,temporal,glow,aperture,diffusion,tone,radiance,
    render(){tone.exposure.value=renderer.toneMappingExposure;tone.headroom.value=displayOutput.headroom;renderer.getDrawingBufferSize(inverseSize.value);inverseSize.value.set(1/inverseSize.value.x,1/inverseSize.value.y);aperture.value=5*renderer.getPixelRatio();diffusion.update();pipeline.render();},
    dispose(){pipeline.dispose();scenePass.dispose();particlePass.dispose();sporeRaster.dispose();temporal?.dispose();diffusion.dispose();lit.dispose();blurred.dispose();combined.dispose();glow.dispose();}};
}
