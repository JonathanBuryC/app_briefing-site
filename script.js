// L'extrait se « lit » une fois au chargement, au rythme d'une voix (≈ 2,6 mots par seconde).
const script = document.getElementById('script');
const today = document.getElementById('today');
const BRIEFING_SECONDS = 245; // durée affichée : 4:05

today.textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const words = [];
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const part of child.textContent.split(/(\s+)/)) {
          if (!part.trim()) { frag.append(part); continue; }
          const span = document.createElement('span');
          span.className = 'w';
          span.textContent = part;
          words.push(span);
          frag.append(span);
        }
        child.replaceWith(frag);
      } else {
        walk(child);
      }
    }
  };
  walk(script);
  script.classList.add('live');

  const bar = document.getElementById('bar');
  const elapsed = document.getElementById('elapsed');
  const start = performance.now() + 600;

  const tick = (now) => {
    const t = Math.max(0, (now - start) / 1000);
    const n = Math.min(words.length, Math.floor(t * 2.6));
    for (let i = 0; i < n; i++) words[i].classList.add('said');
    bar.style.width = `${(t / BRIEFING_SECONDS) * 100}%`;
    elapsed.textContent = `0:${String(Math.floor(t)).padStart(2, '0')}`;
    if (n < words.length) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
