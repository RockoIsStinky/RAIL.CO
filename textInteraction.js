export function textInteraction() {
  const interactables = document.querySelectorAll(".interactable");
  const alpha = 0.2;
  let letters = [];

  interactables.forEach((interact) => {
    const isP = interact.tagName === "P";
    const img = interact.querySelector("img");

    const currentRad = isP ? 2 : img ? 2 : 1;
    const currentStrength = isP ? 0.1 : 0.05;

    if (img) {
      interact.innerHTML = `<span>${img.outerHTML}</span>`;
    } else {
      const text = interact.textContent;

      interact.innerHTML = [...text]
        .map((char, i) =>
          char === " "
            ? "&nbsp;"
            : `<span style="animation-delay:${i * 0.12}s">${char}</span>`,
        )
        .join("");
    }

    const interactableLetters = interact.querySelectorAll("span"); // seperates into span so we get it
    interactableLetters.forEach((letter) => {
      const rect = letter.getBoundingClientRect();

      letter.currentY = 0;
      letter.targetY = 0;
      letter.currentX = 0;
      letter.targetX = 0;
      letter.currentRot = 0;
      letter.targetRot = 0;
      letter.currentScale = 1;
      letter.targetScale = 1;
      letter.baseRad = rect.height * currentRad;
      letter.baseMaxMove = rect.height * currentStrength;
      letter.baseMaxAngle = rect.height * currentStrength * 10;
    });
    letters.push(...interactableLetters);
  });

  function animateLetters() {
    letters.forEach((letter) => {
      letter.currentY += (letter.targetY - letter.currentY) * alpha;
      letter.currentX += (letter.targetX - letter.currentX) * alpha;
      letter.currentRot += (letter.targetRot - letter.currentRot) * alpha;
      letter.currentScale += (letter.targetScale - letter.currentScale) * alpha;

      letter.style.transform = `translateY(${letter.currentY}px) translateX(${letter.currentX}px) rotate(${letter.currentRot}deg) scale(${letter.currentScale})`;
    });
    requestAnimationFrame(animateLetters);
  }

  window.addEventListener("pointermove", (e) => {
    // animating the repelling of the text
    // detect moevment so we can move the text accordingly
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    letters.forEach((letter) => {
      const rect = letter.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2 - letter.currentX;
      const centerY = rect.top + rect.height / 2 - letter.currentY;

      const dx = centerX - mouseX;
      const dy = centerY - mouseY;
      const dist = Math.hypot(dx, dy);

      const currentRadius = letter.baseRad;
      const currentMaxMove = letter.baseMaxMove;
      const currentMaxAngle = letter.baseMaxAngle;
      const currentMaxScale = 10;
      // ah yes
      if (dist < currentRadius) {
        const force = (currentRadius - dist) / currentRadius;
        letter.targetY = Math.sign(dy || 1) * force * currentMaxMove;
        letter.targetX = Math.sign(dx || 1) * force * currentMaxMove;

        letter.targetRot =
          -((dx * dy) / (currentRadius * currentRadius)) *
          force *
          currentMaxAngle;

        const scaleX = dx / currentRadius;
        const scaleY = dy / currentRadius;

        letter.targetScale = 1 + (scaleX + scaleY) * force * -0.4;
      } else {
        letter.targetY = 0;
        letter.targetX = 0;
        letter.targetRot = 0;
        letter.targetScale = 1;
      }
    });
  });

  window.addEventListener("pointerleave", () => {
    letters.forEach((letter) => {
      letter.targetY = 0;
      letter.targetX = 0;
      letter.targetRot = 0;
      letter.targetScale = 1;
    });
  });

  animateLetters();
}
