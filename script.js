import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";

// lovely shaders from shadertoy ported
import { createTiltShiftPass } from "./shaders/tiltShift";
import { bayerdither } from "./shaders/bayerdither";

// helper functions
import { textInteraction } from "./textInteraction";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

let isMouseDown = false;
let isDragging = false;

let lastX = 0;
let lastY = 0;
let rotY = 0;
let rotX = 0;
let currVelY = 0;
let currMouseX = 0;
let currMouseY = 0;
let deltaX = 0;
let deltaY = 0;
let targetRotY = 0;

let trainZ = -1;

let lastMoveTime = 0;

const mouse = new THREE.Vector2();

const pxWidth = 400;
const pxHeight = 340;
const aspect = pxWidth / pxHeight;

let size = 6;

const wheelZ = 0;
const wheelY = 0.1;
const wheelOffsetZ = 2.6;
const wheelOffsetX = 2.2;
const wheelScale = 1.05;
const smollWheelScale = 0.8;

let hoveredObject = null;
const tempColor = new THREE.Color();

// SETUP
const editor = new THREE.Scene();
const camPiv = new THREE.Object3D();
const camera = new THREE.OrthographicCamera(
  -size * aspect,
  size * aspect,
  size,
  -size,
  2,
  120,
);
const renderer = new THREE.WebGLRenderer({
  antialias: false,
});
renderer.setSize(pxWidth, pxHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

editor.background = new THREE.Color(0x336021);

const composer = new EffectComposer(renderer);
composer.setSize(pxWidth, pxHeight);

const renderPass = new RenderPass(editor, camera);
composer.addPass(renderPass);

const textureLoader = new THREE.TextureLoader();
const tileTexture = textureLoader.load("AssetsNFonts/Grid.png");
tileTexture.colorSpace = THREE.SRGBColorSpace;
tileTexture.magFilter = THREE.NearestFilter;
tileTexture.minFilter = THREE.NearestFilter;
tileTexture.wrapS = THREE.RepeatWrapping;
tileTexture.wrapT = THREE.RepeatWrapping;
tileTexture.repeat.set(30, 30);

// RAYCASTER
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// POST PROCESSING
const gtaoPass = new GTAOPass(editor, camera, pxWidth, pxHeight);
gtaoPass.blendIntensity = 1.2;
gtaoPass.updateGtaoMaterial({
  radius: 1.5,
  distanceExponent: 1.5,
  thickness: 1,
  scale: 1.0,
  samples: 16,
});
gtaoPass.updatePdMaterial({
  radius: 2,
  rings: 2,
  samples: 8,
});
composer.addPass(gtaoPass);

const bloomity = new UnrealBloomPass(
  new THREE.Vector2(pxWidth, pxHeight),
  0.05,
  0.4,
  1.0,
);
composer.addPass(bloomity);

addLighting();

// MATERIALS
const trainMaterials = {
  baseLight: new THREE.MeshStandardMaterial({
    name: "Light",
    color: 0xebe0c9,
    roughness: 0.45,
    metalness: 0.4,
  }),
  base: new THREE.MeshStandardMaterial({
    name: "Base",
    color: 0x26464d,
    roughness: 0.55,
    metalness: 0.3,
  }),
  accent: new THREE.MeshStandardMaterial({
    name: "Accent",
    color: 0xc98a2c,
    metalness: 0.45,
    roughness: 0.2,
  }),
  window: new THREE.MeshStandardMaterial({
    name: "Window",
    color: 0x9c8652,
    roughness: 0.15,
    metalness: 0.1,
    emissive: 0xffea00,
    emissiveIntensity: 5,
  }),
  wheel: new THREE.MeshStandardMaterial({
    name: "WheelIn",
    color: 0xffffff,
  }),
  light: new THREE.MeshStandardMaterial({
    name: "Glow",
    emissive: 0xffea00,
    emissiveIntensity: 10,
  }),
  bell: new THREE.MeshStandardMaterial({
    name: "Bell",
    color: 0xca8136,
    roughness: 0.4,
    metalness: 0.6,
  }),
};
const tileMaterial = new THREE.MeshStandardMaterial({
  color: 0x7adacac,
  roughness: 1,
  map: tileTexture,
});

// CAMERA SETUP
camera.position.z = 20;
camera.position.y = 10;
camera.lookAt(0, 1, 0);
targetRotY = Math.PI / 5.4;

function loadMesh(
  path,
  position = new THREE.Vector3(0, 0, 0),
  newScale = new THREE.Vector3(1, 1, 1),
) {
  const loader = new OBJLoader();
  loader.load(
    path,
    (object) => {
      const materialList = Object.values(trainMaterials);
      object.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          const match = materialList.find((mat) =>
            child.name.includes(mat.name),
          );
          if (match) child.material = match.clone();
        }
      });

      object.scale.copy(newScale);
      object.position.copy(position);
      editor.add(object);
    },
    undefined,
    (error) => {
      console.error("objfailed lol:", error);
    },
  );
}

loadMesh(
  "AssetsNFonts/Body/Cylindrical.obj",
  new THREE.Vector3(0, 0, 1 + trainZ),
);

loadMesh(
  "AssetsNFonts/SmokeStackers/Default.obj",
  new THREE.Vector3(0, 1.8, 4.4 + trainZ),
);

loadMesh(
  "AssetsNFonts/Headlights/SingleCircular.obj",
  new THREE.Vector3(0, 1, 5 + trainZ),
);
const omniLight = new THREE.PointLight(0xffea00, 20, 10, 0.1);
omniLight.position.z = 5;
editor.add(omniLight);

loadMesh(
  "AssetsNFonts/Bell/Bell.obj",
  new THREE.Vector3(0, 2.6, trainZ + 3.1),
  new THREE.Vector3(0.35, 0.35, 0.35),
);

loadMesh("AssetsNFonts/SteamDome/Bean.obj", new THREE.Vector3(0, 2.3, trainZ));

loadMesh(
  "AssetsNFonts/SteamDome/Sand.obj",
  new THREE.Vector3(0, 2.3, trainZ + 1.7),
);

const countX = 2;
const countZ = 2;

for (let z = 0; z < countZ; z++) {
  for (let x = 0; x < countX; x++) {
    const posX = (x - (countX - 1) / 2) * wheelOffsetX;
    const posZ = wheelZ + (z - (countZ - 1) / 2) * wheelOffsetZ + trainZ;

    loadMesh(
      "AssetsNFonts/NormalWheel.obj",
      new THREE.Vector3(posX, wheelY, posZ),
      new THREE.Vector3(wheelScale, wheelScale, wheelScale),
    );
  }
}

for (let x = 0; x < countX; x++) {
  const posX = (x - (countX - 1) / 2) * wheelOffsetX;
  const posZ = wheelZ + countZ + 1.8 + trainZ;

  loadMesh(
    "AssetsNFonts/NormalWheel.obj",
    new THREE.Vector3(posX, wheelY - (wheelScale - smollWheelScale) / 2, posZ),
    new THREE.Vector3(wheelScale, smollWheelScale, smollWheelScale),
  );
}

// FLOOR
const boxGeo = new THREE.BoxGeometry(120, 1, 120);
const box = new THREE.Mesh(boxGeo, tileMaterial);
box.position.y = -1.35;
box.receiveShadow = true;
editor.add(box);
box.raycast = () => {};

function animate() {
  if (isMouseDown) {
    currVelY += (rotY - currVelY) * 0.21;
  } else {
    currVelY *= 0.95;
  }

  targetRotY += currVelY * (1 / 60);

  const diffX = Math.atan2(
    Math.sin(targetRotY - camPiv.rotation.y),
    Math.cos(targetRotY - camPiv.rotation.y),
  );

  camPiv.rotation.y += diffX * 0.3;

  editor.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const isHovered = child === hoveredObject;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((mat) => {
      if (!mat.emissive) return;
      if (!mat.userData.baseColor) mat.userData.baseColor = mat.color.clone();
      if (mat.userData.baseIntensity === undefined) {
        if (mat.emissive.getHex() === 0x000000) {
          mat.emissive.copy(mat.userData.baseColor);
          mat.emissiveIntensity = 0;
        }
        mat.userData.baseColor = mat.color.clone();
        mat.userData.baseIntensity = mat.emissiveIntensity;
      }

      tempColor.copy(mat.userData.baseColor);
      let targetIntensity = mat.userData.baseIntensity;
      if (isHovered) {
        tempColor.multiplyScalar(1.2);
        targetIntensity = mat.userData.baseIntensity + 1;
      }
      mat.color.lerp(tempColor, 0.15);
      mat.emissiveIntensity = larp(
        mat.emissiveIntensity,
        targetIntensity,
        0.15,
      );
    });
  });

  composer.render();
}

renderer.setAnimationLoop(animate);

function updateMouseVector(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

function getCoordinates(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.changedTouches && e.changedTouches.length > 0) {
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

const editorRender = document.querySelector("canvas");

editorRender.addEventListener("mousedown", (e) => {
  editorRender.style.cursor = "grabbing";
  isMouseDown = true;
  lastX = e.clientX;
  lastMoveTime = performance.now();
});

editorRender.addEventListener("mousemove", (e) => {
  if (!isMouseDown) return;

  const now = performance.now();
  const coords = getCoordinates(e);

  currMouseX = coords.x;
  currMouseY = coords.y;

  deltaX = currMouseX - lastX;
  deltaY = currMouseY - lastY;

  const moveDt = Math.max((now - lastMoveTime) / 1000, 0.001);

  rotY = -(deltaX * 0.01) / moveDt;

  if (Math.abs(deltaX) > 0) {
    isDragging = true;
  }

  lastX = currMouseX;
  lastY = currMouseY;
  lastMoveTime = now;
});
window.addEventListener("mouseup", () => {
  editorRender.style.cursor = "grab";
  isMouseDown = false;
  isDragging = false;
  rotY = 0;
  rotX = 0;
});
window.addEventListener("mouseout", () => {
  editorRender.style.cursor = "grab";
  isMouseDown = false;
  isDragging = false;
  rotY = 0;
  rotX = 0;
});

//SELECTION
editorRender.addEventListener("mousemove", (e) => {
  updateMouseVector(e.clientX, e.clientY);
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(editor.children, true);
  hoveredObject = intersects.length > 0 ? intersects[0].object : null;
});

textInteraction();

// HELPER FUNCTIONS
// wooo larping function returns!
function larp(start, end, alpha) {
  return (start = start + (end - start) * alpha);
}

function addLighting() {
  const tiltPass = createTiltShiftPass(renderer, {
    maxBlur: 10.0,
    focusWidth: 0.2,
    feather: 0.55,
    saturation: 1.0,
    contrast: 1.0,
    vignette: 1,
  });
  composer.addPass(tiltPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);
  composer.addPass(bayerdither(pxWidth, pxHeight, 1, 1.0, 6.0));

  camPiv.add(camera);

  editor.add(camPiv);

  const editorContainer = document.getElementById("editorContainer");
  editorContainer.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x9a9e85, 0.5);
  editor.add(ambientLight);

  const rectLight = new THREE.RectAreaLight(0xb2c797, 60, 5, 2);
  rectLight.position.set(-5, 10, 3);
  rectLight.lookAt(0, 0, 0);
  editor.add(rectLight);

  const sunLight = new THREE.DirectionalLight(0xffb53d, 4.0);

  sunLight.position.set(-30, 40, 5);
  sunLight.target.position.set(0, 0, 0);

  sunLight.castShadow = true;

  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 80;

  sunLight.shadow.camera.left = -15;
  sunLight.shadow.camera.right = 15;
  sunLight.shadow.camera.top = 15;
  sunLight.shadow.camera.bottom = -15;

  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.02;

  editor.add(sunLight);
  editor.add(sunLight.target);

  const centerStripeLight = new THREE.DirectionalLight(0xffb53d, 2.5);
  centerStripeLight.position.set(10, 4, 12);
  editor.add(centerStripeLight);
}
