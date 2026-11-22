import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { RectAreaLightHelper } from "three/addons/helpers/RectAreaLightHelper.js";
import { ThreeMFLoader } from "three/examples/jsm/Addons.js";

import { bayerdither } from "./shaders/bayerdither";
import { emissive } from "three/tsl";
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
const pxHeight = 300;
const aspect = pxWidth / pxHeight;

let size = 6;

const wheelZ = 0;
const wheelY = 0.1;
const wheelOffsetZ = 2.6;
const wheelOffsetX = 2.2;
const wheelScale = 1.05;
const smollWheelScale = 0.8;

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
  0.005,
  0.1,
  0.2,
);

composer.addPass(bloomity);

const outputPass = new OutputPass();
composer.addPass(outputPass);
composer.addPass(bayerdither(pxWidth, pxHeight, 1, 1.0, 6.0));

camPiv.add(camera);

editor.add(camPiv);

renderer.setSize(pxWidth, pxHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
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

editor.add(sunLight);
const baseMaterial = new THREE.MeshStandardMaterial({
  color: 0x26464d,
  roughness: 0.55,
  metalness: 0.3,
});

const baseLightMaterial = new THREE.MeshStandardMaterial({
  color: 0xebe0c9,
  roughness: 0.45,
  metalness: 0.4,
});

const accentMaterial = new THREE.MeshStandardMaterial({
  color: 0xc98a2c,
  metalness: 0.45,
  roughness: 0.2,
});

const windowMaterial = new THREE.MeshStandardMaterial({
  color: 0x9c8652,
  roughness: 0.15,
  metalness: 0.1,
  emissive: 0xffea00,
  emissiveIntensity: 30,
});
const wheelMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
});

const lightMaterial = new THREE.MeshStandardMaterial({
  emissive: 0xffea00,
  emissiveIntensity: 100,
});

const bellMaterial = new THREE.MeshStandardMaterial({
  color: 0xca8136,
  roughness: 0.4,
  metalic: 0.6,
});

const tileMaterial = new THREE.MeshStandardMaterial({
  color: 0x7adacac,
  roughness: 1,
  map: tileTexture,
});

camera.position.z = 20;
camera.position.y = 10;
camera.lookAt(0, 2, 0);
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
      object.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.name.includes("Light")) {
            child.material = baseLightMaterial;
          } else if (child.name.includes("Base")) {
            child.material = baseMaterial;
          }
          if (child.name.includes("Accent")) {
            child.material = accentMaterial;
          }
          if (child.name.includes("Window")) {
            child.material = windowMaterial;
          }
          if (child.name.includes("WheelIn")) {
            child.material = wheelMaterial;
          }
          if (child.name.includes("Glow")) {
            console.log("found glow");
            child.material = lightMaterial;
          }
          if (child.name.includes("Bell")) {
            child.material = bellMaterial;
          }
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
  new THREE.Vector3(0, 1.8, 3.6 + trainZ),
);

loadMesh(
  "AssetsNFonts/Headlights/SingleCircular.obj",
  new THREE.Vector3(0, 1, 5 + trainZ),
);

loadMesh(
  "AssetsNFonts/Bell/Bell.obj",
  new THREE.Vector3(0, 2.8, 0.8),
  new THREE.Vector3(0.35, 0.35, 0.35),
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

const boxGeo = new THREE.BoxGeometry(120, 1, 120);
const box = new THREE.Mesh(boxGeo, tileMaterial);
box.position.y = -1.4;
box.receiveShadow = true;
editor.add(box);

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

  composer.render();
}

renderer.setAnimationLoop(animate);

function updateMouseVector(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
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
