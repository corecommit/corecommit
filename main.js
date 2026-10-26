const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Build the six faces of each cube.
document.querySelectorAll('.cube').forEach(cube => {
  for (let i = 0; i < 6; i++) {
    const f = document.createElement('div');
    f.className = 'face';
    cube.appendChild(f);
  }
});

// Split the headline into words and letters so it can animate in.
const title = document.getElementById('title');
title.innerHTML = title.textContent.split(' ').map(w =>
  `<span class="w">${[...w].map(c => `<span class="ch">${c}</span>`).join('')}</span>`).join(' ');

if (reduced || typeof anime === 'undefined') {
  document.body.classList.add('static');
} else {
  // Intro: letters rise in one after another.
  anime({
    targets: '#title .ch',
    translateY: [40, 0],
    opacity: [0, 1],
    rotateX: [-70, 0],
    delay: anime.stagger(28),
    duration: 900,
    easing: 'easeOutExpo'
  });
  anime({ targets: '.hello', opacity: [0, 1], translateY: [12, 0], duration: 700, easing: 'easeOutQuad' });

  // Three nested cubes rotating in 3D at different speeds and directions.
  anime({ targets: '.cube-a', rotateX: 360, rotateY: 360, duration: 26000, easing: 'linear', loop: true });
  anime({ targets: '.cube-b', rotateY: -360, rotateZ: 360, duration: 18000, easing: 'linear', loop: true });
  anime({ targets: '.cube-c', rotateX: -360, rotateZ: -360, duration: 12000, easing: 'linear', loop: true });

  // Cubes scale in once, then the middle one breathes gently.
  anime({ targets: '.stage .cube', scale: [0, 1], delay: anime.stagger(160), duration: 1400, easing: 'easeOutElastic(1, .7)' });
  anime({ targets: '.stage', translateY: [-8, 8], direction: 'alternate', loop: true, duration: 3600, easing: 'easeInOutSine' });

  // Tilt the whole scene toward the pointer.
  window.addEventListener('pointermove', e => {
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;
    anime.remove('.tilt');
    anime({ targets: '.tilt', rotateY: x * 40, rotateX: -y * 40, duration: 800, easing: 'easeOutQuad' });
  });

  // Reveal text blocks as they scroll into view.
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      anime({ targets: en.target, opacity: [0, 1], translateY: [24, 0], duration: 800, easing: 'easeOutQuart' });
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}
