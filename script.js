// Dates du jour dans les maquettes
const auj = new Date();
const fr = (o) => auj.toLocaleDateString('fr-FR', o);
document.querySelectorAll('[data-date]').forEach((el) => (el.textContent = fr({ weekday: 'long', day: 'numeric', month: 'long' })));
document.querySelectorAll('[data-jour]').forEach((el) => {
  const j = fr({ weekday: 'long' });
  el.textContent = j.charAt(0).toUpperCase() + j.slice(1);
});
document.querySelectorAll('[data-jour-mois]').forEach((el) => (el.textContent = fr({ day: 'numeric', month: 'long' })));

// La scène : le téléphone récolte l'essentiel (agenda, trafic, mails, météo),
// chaque info surlignée s'envole vers le casque et devient une phrase du briefing.
const scene = document.getElementById('scene');
const flux = document.getElementById('flux');
const phrase = document.getElementById('phrase');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
// Attend la fin d'une animation, sans jamais bloquer la boucle si le navigateur ne la termine pas.
const fin = (anim, ms) => Promise.race([anim.finished, pause(ms + 150)]);
const CASQUE = { x: 358 / 600, y: 220 / 520 }; // position du casque dans l'illustration

function dire(texte) {
  phrase.replaceChildren(...texte.split(' ').flatMap((mot, i) => {
    const s = document.createElement('span');
    s.className = 'm';
    s.textContent = mot;
    return i ? [' ', s] : [s];
  }));
  const mots = [...phrase.querySelectorAll('.m')];
  return new Promise((fini) => {
    let i = 0;
    const t = setInterval(() => {
      if (i < mots.length) mots[i++].classList.add('dit');
      else { clearInterval(t); setTimeout(fini, 700); }
    }, 330);
  });
}

async function envol(ligne) {
  const s = scene.getBoundingClientRect();
  const r = ligne.getBoundingClientRect();
  const puce = document.createElement('div');
  puce.className = 'envol';
  puce.textContent = ligne.querySelector('mark').textContent;
  puce.style.left = `${r.left - s.left + r.width * 0.25}px`;
  puce.style.top = `${r.top - s.top + r.height * 0.2}px`;
  scene.append(puce);
  const p = puce.getBoundingClientRect();
  const dx = s.left + s.width * CASQUE.x - (p.left + p.width / 2);
  const dy = s.top + s.height * CASQUE.y - (p.top + p.height / 2);
  await fin(puce.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - s.height * 0.12}px) scale(0.9)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.15)`, opacity: 0 },
  ], { duration: 1100, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' }), 1100);
  puce.remove();
}

async function boucle() {
  const lignes = [...flux.children];
  lignes.forEach((l) => l.classList.remove('actif', 'lu', 'ecarte'));
  await dire(`Bonjour Camille, nous sommes ${fr({ weekday: 'long', day: 'numeric', month: 'long' })}.`);
  let parole = Promise.resolve();
  for (const ligne of lignes) {
    if ('pub' in ligne.dataset) { // une pub : écartée, jamais racontée
      ligne.classList.add('ecarte');
      await pause(1100);
      continue;
    }
    ligne.classList.add('actif');
    await pause(1000);
    await parole; // la phrase précédente se termine avant d'envoyer la suivante
    const vol = envol(ligne);
    ligne.classList.replace('actif', 'lu');
    await vol;
    parole = dire(ligne.dataset.phrase);
  }
  await parole;
  await pause(1500);
  boucle();
}

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) boucle();
