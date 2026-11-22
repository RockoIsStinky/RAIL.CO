export function textInteraction() {
  const interactables = document.querySelectorAll(".interactable");
  const alpha = 0.1;
  let letters = [];

  interactables.forEach((interact) => {
    const isP = interact.tagName === "P";

    const currentRad = isP ? 4 : 1;
    const currentStrength = isP ? 0.3 : 0.05;
    const text = interact.textContent;

    interact.innerHTML = [...text]
      .map((char, i) =>
        char === " "
          ? "&nbsp;"
          : `<span style="animation-delay:${i * 0.12}s">${char}</span>`,
      )
      .join("");

    const interactableLetters = interact.querySelectorAll("span"); // seperates into span so we get it
    interactableLetters.forEach((letter) => {
      const rect = letter.getBoundingClientRect();

      letter.currentY = 0;
      letter.targetY = 0;
      letter.currentX = 0;
      letter.targetX = 0;
      letter.currentRot = 0;
      letter.targetRot = 0;
      letter.baseRad = rect.height * currentRad;
      letter.baseMaxMove = rect.height * currentStrength;
      letter.baseMaxAngle = rect.height * currentStrength * 2;
    });
    letters.push(...interactableLetters);
  });

  window.addEventListener("resize", () => {
    interactables.forEach((interact) => {
      const rect = title.getBoundingClientRect();

      interaect.querySelectorAll("span").forEach((letter) => {
        letter.baseRad = rect.height * repelRad;
        letter.baseMaxMove = rect.height * repelStrength;
      });
    });
  });

  function animateLetters() {
    letters.forEach((letter) => {
      letter.currentY += (letter.targetY - letter.currentY) * alpha;
      letter.currentX += (letter.targetX - letter.currentX) * alpha;
      letter.currentRot += (letter.targetRot - letter.currentRot) * alpha;

      letter.style.transform = `translateY(${letter.currentY}px) translateX(${letter.currentX}px) rotate(${letter.currentRot}deg)`;
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

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2 - letter.currentY;

      const dx = centerX - mouseX;
      const dy = centerY - mouseY;
      const dist = Math.hypot(dx, dy);

      const currentRadius = letter.baseRad;
      const currentMaxMove = letter.baseMaxMove;
      const currentMaxAngle = letter.baseMaxAngle;
      // ah yes
      if (dist < currentRadius) {
        const force = (currentRadius - dist) / currentRadius;
        letter.targetY = Math.sign(dy || 1) * force * currentMaxMove;
        letter.targetX = Math.sign(dx || 1) * force * currentMaxMove;
        letter.targetRot = (dx / currentRadius) * force * currentMaxAngle;
      } else {
        letter.targetY = 0;
        letter.targeTX = 0;
        letter.targetRot = 0;
      }
    });
  });

  window.addEventListener("pointerleave", () => {
    letters.forEach((letter) => {
      letter.targetY = 0;
      letter.targetX = 0;
      letter.targetRot = 0;
    });
  });

  animateLetters();
}
