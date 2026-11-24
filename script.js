// Dates du jour dans les maquettes
const auj = new Date();
const fr = (o) => auj.toLocaleDateString('fr-FR', o);
document.querySelectorAll('[data-date]').forEach((el) => (el.textContent = fr({ weekday: 'long', day: 'numeric', month: 'long' })));
document.querySelectorAll('[data-jour]').forEach((el) => {
  const j = fr({ weekday: 'long' });
  el.textContent = j.charAt(0).toUpperCase() + j.slice(1);
});
document.querySelectorAll('[data-jour-mois]').forEach((el) => (el.textContent = fr({ day: 'numeric', month: 'long' })));

// La scène : des mails et des rendez-vous arrivent, l'essentiel est surligné,
// puis il file dans le casque et devient une phrase du briefing.
const ITEMS = [
  { icone: 'i-cal', de: 'Agenda', quand: '09:30', corps: '<mark>Point d’équipe</mark>, salle B',
    phrase: 'Ta journée commence à 9 h 30 avec le point d’équipe, en salle B.' },
  { icone: 'i-mail', de: 'Imprimerie Duval', quand: '07:12', corps: 'Devis n° 2481 : <mark>à valider avant jeudi</mark>',
    phrase: 'Le devis de l’imprimerie est à valider avant jeudi.' },
  { icone: 'i-mail', de: 'Boutique Mode', quand: '05:40', corps: '-40 % ce week-end seulement <span class="tag">Pub</span>',
    phrase: null },
  { icone: 'i-mail', de: 'Sarah Martin', quand: 'hier', corps: 'Planning de décembre : <mark>tu me réponds ce matin ?</mark>',
    phrase: 'Sarah attend ta réponse sur le planning de décembre.' },
  { icone: 'i-cal', de: 'Agenda', quand: '12:30', corps: '<mark>Déjeuner avec Hugo</mark>, confirmé',
    phrase: 'À midi et demi, tu déjeunes avec Hugo.' },
];

const scene = document.getElementById('scene');
const cartes = document.getElementById('cartes');
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

function carte(item) {
  const c = document.createElement('div');
  c.className = 'carte';
  c.innerHTML = `<div class="tete"><svg aria-hidden="true"><use href="#${item.icone}"/></svg><span>${item.de}</span><span>${item.quand}</span></div><p>${item.corps}</p>`;
  cartes.append(c);
  c.animate([{ opacity: 0, transform: 'translateX(-24px)' }, { opacity: 1, transform: 'none' }],
    { duration: 500, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
  return c;
}

async function vole(c) {
  const r = c.getBoundingClientRect();
  const s = scene.getBoundingClientRect();
  const dx = s.left + s.width * CASQUE.x - (r.left + r.width / 2);
  const dy = s.top + s.height * CASQUE.y - (r.top + r.height / 2);
  await fin(c.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(.12)` }],
    { duration: 850, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }), 850);
  c.remove();
}

async function boucle() {
  cartes.replaceChildren();
  await dire(`Bonjour Camille, nous sommes ${fr({ weekday: 'long', day: 'numeric', month: 'long' })}.`);
  let parole = Promise.resolve();
  for (const item of ITEMS) {
    const c = carte(item);
    await pause(700);
    if (!item.phrase) { // une pub : écartée, jamais racontée
      c.classList.add('ecarte');
      await pause(600);
      await fin(c.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(12px)' }], { duration: 600, fill: 'forwards' }), 600);
      c.remove();
      continue;
    }
    c.classList.add('surligne');
    await pause(900);
    await parole; // la phrase précédente se termine avant d'avaler la suivante
    await vole(c);
    parole = dire(item.phrase);
  }
  await parole;
  await pause(800);
  boucle();
}

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) boucle();
