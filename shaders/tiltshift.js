import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export const TiltShiftShader = {
  uniforms: {
    tDiffuse: { value: null },
    iResolution: { value: new THREE.Vector2(1920, 1080) },
    uFocusY: { value: 0.5 },
    uFocusWidth: { value: 0.25 },
    uFeather: { value: 0.15 },
    uMaxBlur: { value: 14.0 },
    uTiltAngle: { value: 0.0 },
    uSaturation: { value: 1.25 },
    uContrast: { value: 1.08 },
    uVignette: { value: 0.25 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 iResolution;
    uniform float uFocusY;
    uniform float uFocusWidth;
    uniform float uFeather;
    uniform float uMaxBlur;
    uniform float uTiltAngle;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uVignette;
    varying vec2 vUv;

    const int SAMPLES = 16;
    const float GOLDEN_ANGLE = 2.39996323;
    const mat2 ROT = mat2(cos(GOLDEN_ANGLE), sin(GOLDEN_ANGLE), -sin(GOLDEN_ANGLE), cos(GOLDEN_ANGLE));

    vec3 adjustSaturationContrast(vec3 c, float sat, float con) {
      float luma = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(luma), c, sat);
      c = (c - 0.5) * con + 0.5;
      return c;
    }

    vec3 blurTS(vec2 uv, float radius) {
      vec2 texel = 1.0 / iResolution.xy;
      vec3 col = vec3(0.0);
      float wsum = 0.0;
      vec2 dir = vec2(1.0, 0.0);

      for (int i = 0; i < SAMPLES; i++) {
        float t = (float(i) + 0.5) / float(SAMPLES);
        float r = sqrt(t) * radius;
        dir = ROT * dir;
        float w = 1.0 - 0.5 * t;
        col += texture2D(tDiffuse, clamp(uv + dir * r * texel, 0.001, 0.999)).rgb * w;
        wsum += w;
      }

      return col / wsum;
    }

    void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 uv = fragCoord / iResolution.xy;
      vec2 p = uv - vec2(0.5, uFocusY);
      float s = sin(uTiltAngle);
      float c = cos(uTiltAngle);
      float bandDist = abs(p.x * s + p.y * c);

      float blurFactor = smoothstep(uFocusWidth, uFocusWidth + uFeather, bandDist);
      float radius = blurFactor * uMaxBlur;

      vec3 col = (radius <= 0.01) ? texture2D(tDiffuse, uv).rgb : blurTS(uv, radius);
      col = adjustSaturationContrast(col, uSaturation, uContrast);

      vec2 vigUv = uv - 0.5;
      float vig = 1.0 - uVignette * dot(vigUv, vigUv) * 2.0;
      col *= clamp(vig, 0.0, 1.0);

      fragColor = vec4(col, 1.0);
    }

    void main() {
      mainImage(gl_FragColor, vUv * iResolution.xy);
    }
  `,
};

export function createTiltShiftPass(renderer, options = {}) {
  const {
    focusY = 0.5,
    focusWidth = 0.25,
    feather = 0.15,
    maxBlur = 14.0,
    tiltAngle = 0.0,
    saturation = 1.25,
    contrast = 1.08,
    vignette = 0.25,
  } = options;

  const bufferSize = new THREE.Vector2();
  renderer.getDrawingBufferSize(bufferSize);

  const pass = new ShaderPass(TiltShiftShader);
  pass.uniforms.iResolution.value.copy(bufferSize);
  pass.uniforms.uFocusY.value = focusY;
  pass.uniforms.uFocusWidth.value = focusWidth;
  pass.uniforms.uFeather.value = feather;
  pass.uniforms.uMaxBlur.value = maxBlur;
  pass.uniforms.uTiltAngle.value = tiltAngle;
  pass.uniforms.uSaturation.value = saturation;
  pass.uniforms.uContrast.value = contrast;
  pass.uniforms.uVignette.value = vignette;

  return pass;
}

export function createTiltShiftComposer(renderer, scene, camera, options = {}) {
  const size = new THREE.Vector2();
  renderer.getSize(size);

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(size.x, size.y);
  composer.addPass(new RenderPass(scene, camera));

  const tiltPass = createTiltShiftPass(renderer, options);
  composer.addPass(tiltPass);

  if (options.includeOutputPass !== false) {
    composer.addPass(new OutputPass());
  }

  return {
    composer,
    tiltPass,
    setSize(width, height) {
      composer.setSize(width, height);
      renderer.getDrawingBufferSize(tiltPass.uniforms.iResolution.value);
    },
  };
}
