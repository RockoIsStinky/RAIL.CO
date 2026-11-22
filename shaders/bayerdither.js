import * as THREE from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

const ShadertoyOrderedDither = {
  uniforms: {
    tDiffuse: { value: null },
    iResolution: { value: new THREE.Vector3(800, 600, 1) },
    granularity: { value: 3.0 },
    colorLevels: { value: 4.0 },
    gamma: { value: 0.85 },
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
    uniform vec3 iResolution;
    uniform float granularity;
    uniform float colorLevels;
    uniform float gamma;
    varying vec2 vUv;

    mat4 ditherMat = mat4(
      vec4(0.0, 8.0, 2.0, 10.0),
      vec4(12.0, 4.0, 14.0, 6.0),
      vec4(3.0, 11.0, 1.0, 9.0),
      vec4(15.0, 7.0, 13.0, 5.0)
    ) / 16.0;

    float getBayer(int x, int y) {
      for (int i = 0; i < 4; i++) {
        for (int j = 0; j < 4; j++) {
          if (i == x && j == y) return ditherMat[i][j];
        }
      }
      return 0.0;
    }

    void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 pixelCoords = floor(fragCoord / granularity);
      vec2 uv = (pixelCoords * granularity + 0.5 * granularity) / iResolution.xy;
      vec3 tex = texture2D(tDiffuse, uv).rgb;

      tex = pow(max(tex, vec3(0.0)), vec3(1.0 / gamma));

      int dx = int(mod(pixelCoords.x, 4.0));
      int dy = int(mod(pixelCoords.y, 4.0));
      float threshold = getBayer(dx, dy) - 0.5;

      vec3 dithered = tex + (threshold / colorLevels);
      vec3 quantized = floor(dithered * colorLevels + 0.5) / colorLevels;

      fragColor = vec4(clamp(quantized, 0.0, 1.0), 1.0);
    }

    void main() {
      mainImage(gl_FragColor, gl_FragCoord.xy);
    }
  `,
};

export function bayerdither(
  width,
  height,
  pixelRatio = 2,
  granularity = 3.0,
  colorLevels = 4.0,
) {
  const pass = new ShaderPass(ShadertoyOrderedDither);
  pass.uniforms.iResolution.value.set(
    width * pixelRatio,
    height * pixelRatio,
    1,
  );
  pass.uniforms.granularity.value = granularity;
  pass.uniforms.colorLevels.value = colorLevels;
  return pass;
}
