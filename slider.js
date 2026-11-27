import * as THREE from "three";
export function initSlider() {
  const hue = document.getElementById("hue");
  const saturation = document.getElementById("saturation");
  const value = document.getElementById("value");
  const colorRect = document.querySelector(".colorRect");

  const hueVal = document.getElementById("hueVal");
  const saturationVal = document.getElementById("saturationVal");
  const valueVal = document.getElementById("valueVal");

  handleColors();
  function handleColors() {
    hueVal.textContent = hue.value;
    saturationVal.textContent = saturation.value;
    valueVal.textContent = value.value;
    const h = hue.value / 255;
    const s = saturation.value / 255;
    const v = value.value / 255;
    const color = new THREE.Color().setHSL(h, s, v);
    colorRect.style.backgroundColor = color.getStyle();

    const minSat = new THREE.Color().setHSL(h, 0, v).getStyle();
    const maxSat = new THREE.Color().setHSL(h, 1, v).getStyle();
    const minVal = new THREE.Color().setHSL(h, s, 1).getStyle();
    const midVal = new THREE.Color().setHSL(h, s, 0.5).getStyle();
    const maxVal = new THREE.Color().setHSL(h, s, 0).getStyle();

    saturation.style.background = `linear-gradient(90deg, ${minSat}, ${maxSat})`;
    value.style.background = `linear-gradient(-90deg, ${minVal} 0%, ${midVal} 50%, ${maxVal} 100%)`;
  }
  hue.addEventListener("input", handleColors);
  saturation.addEventListener("input", handleColors);
  value.addEventListener("input", handleColors);
}
