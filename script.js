// Dates du jour dans les maquettes
const auj = new Date();
const fr = (o) => auj.toLocaleDateString('fr-FR', o);
document.querySelectorAll('[data-date]').forEach((el) => (el.textContent = fr({ weekday: 'long', day: 'numeric', month: 'long' })));
document.querySelectorAll('[data-jour]').forEach((el) => {
  const j = fr({ weekday: 'long' });
  el.textContent = j.charAt(0).toUpperCase() + j.slice(1);
});
document.querySelectorAll('[data-jour-mois]').forEach((el) => (el.textContent = fr({ day: 'numeric', month: 'long' })));

// La scène : le téléphone ouvre tes applis une à une. L'info importante est surlignée,
// part dans le micro, et la voix dit aussitôt la phrase du brief qui lui correspond.
const scene = document.getElementById('scene');
const ecran = document.getElementById('ecran');
const appli = document.getElementById('appli');
const orbe = document.getElementById('orbe');
const compte = document.getElementById('compte');
const phrase = document.getElementById('phrase');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
// Attend la fin d'une animation, sans jamais bloquer la boucle si le navigateur ne la termine pas.
const fin = (anim, ms) => Promise.race([anim.finished, pause(ms + 150)]);

const APPS = [
  { nom: 'Agenda', fond: '#2b2e8c', icone: 'i-cal', puce: '9 h 30 : point d’équipe',
    lignes: [['09:30', 'Point d’équipe, salle B', true], ['12:30', 'Déjeuner avec Hugo'], ['18:00', 'Sport']] },
  { nom: 'Trafic', fond: '#ffd23f', encre: '#17183b', icone: 'i-metro', puce: 'Ligne 13 : +10 min',
    lignes: [['Ligne 13', '10 min de retard', true], ['RER B', 'Trafic normal'], ['Bus 95', 'Trafic normal']] },
  { nom: 'Météo', fond: '#7fa7e8', icone: 'i-pluie', puce: 'Pluie à 18 h',
    lignes: [['Ce matin', '9°, nuageux'], ['18 h', 'Pluie, prends un parapluie', true], ['Demain', '11°, soleil']] },
  { nom: 'Mails', fond: '#5b5fd6', icone: 'i-mail', puce: 'Devis avant jeudi',
    lignes: [['Imprimerie Duval', 'Devis à valider avant jeudi', true], ['Boutique Mode', '-40 % ce week-end'], ['Sarah Martin', 'Planning de décembre']] },
  { nom: 'Factures', fond: '#3fae8c', icone: 'i-facture', puce: 'EDF avant vendredi',
    lignes: [['EDF', '64 € à payer avant vendredi', true], ['Box internet', 'Payée'], ['Assurance', 'Le 12 décembre']] },
];

// Le texte du brief : une phrase d'accueil, une phrase par appli, une phrase de fin.
// Le script backend/app/demo_audio.py lit ces phrases pour enregistrer la vraie voix, dans cet ordre.
const BRIEF = {
  accueil: 'Bonjour Camille, voici ton brief du matin.',
  Agenda: 'Ta journée commence à neuf heures et demie, avec le point d’équipe en salle B.',
  Trafic: 'Sur la ligne 13, compte dix minutes de retard : pars un peu plus tôt.',
  Météo: 'Il pleuvra vers dix-huit heures, pense à prendre un parapluie.',
  Mails: 'Côté mails, l’imprimerie attend ta validation du devis avant jeudi.',
  Factures: 'Et n’oublie pas la facture EDF, à régler avant vendredi.',
  fin: 'Belle journée !',
};
const ORDRE = ['accueil', ...APPS.map((a) => a.nom), 'fin'];

// ---------- Son ----------
// Voix : un vrai enregistrement (audio/<voix>/brief-N.mp3) s'il existe, sinon la plus belle voix française
// du navigateur. Oiseaux : synthétisés dans le navigateur, sans fichier.
// Le son est mis par défaut. Les navigateurs bloquent le son tant que le visiteur n'a rien touché :
// on essaie tout de suite, puis on le lance au premier clic, toucher ou touche du clavier.
const boutonSon = document.getElementById('son');
let sonActif = true;
let audio = null; // { ctx, oiseaux: GainNode, chante }
let lecture = null; // la phrase enregistrée en cours : { n, avancer, fin, a }
let voix = 'sulafat'; // les quatre voix de l'app ; on en change à tout moment
let enregistrement = null; // true si les enregistrements répondent

fetch('audio/sulafat/brief-0.mp3', { method: 'HEAD' })
  .then((r) => { enregistrement = r.ok; })
  .catch(() => { enregistrement = false; });

function voixFr() {
  const fr = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr'));
  const score = (v) =>
    (/natural|neural|premium|enhanced|siri/i.test(v.name) ? 4 : 0) +
    (/amélie|amelie|audrey|denise|vivienne|eloise|google/i.test(v.name) ? 2 : 0) +
    (v.localService ? 0 : 1);
  return fr.sort((a, b) => score(b) - score(a))[0] || null;
}

function baisserOiseaux(oui) {
  audio?.oiseaux.gain.setTargetAtTime(oui ? 0.25 : 1, audio.ctx.currentTime, oui ? 0.2 : 0.6);
}

// Joue une phrase et appelle avancer(fraction) pour faire avancer le sous-titre.
function jouer(cle, texte, avancer) {
  if (!sonActif || audio?.ctx.state !== 'running') return null; // son pas encore autorisé : sous-titre seul
  baisserOiseaux(true);
  let fini;
  if (enregistrement) {
    fini = new Promise((fin) => {
      lecture = { n: ORDRE.indexOf(cle), avancer, fin, a: null };
      lancer(0);
    });
  } else if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = 'fr-FR';
    u.rate = 0.94;
    const v = voixFr();
    if (v) u.voice = v;
    u.onboundary = (e) => avancer(e.charIndex / texte.length);
    fini = new Promise((r) => { u.onend = r; u.onerror = r; });
    speechSynthesis.speak(u);
  } else {
    return null;
  }
  fini.then(() => baisserOiseaux(false));
  return fini;
}

// Lance la phrase en cours dans la voix choisie, à partir de position (0 à 1).
// Changer de voix en pleine phrase reprend au même endroit : l'animation ne s'arrête pas.
function lancer(position) {
  const l = lecture;
  const a = new Audio(`audio/${voix}/brief-${l.n}.mp3`);
  const finie = () => l.a === a && l.fin();
  a.ontimeupdate = () => a.duration && l.avancer(a.currentTime / a.duration);
  a.onended = finie;
  a.onerror = finie;
  if (position) a.addEventListener('loadedmetadata', () => { a.currentTime = position * a.duration; }, { once: true });
  l.a?.pause();
  l.a = a;
  a.play().catch(finie);
}

const choixVoix = document.querySelectorAll('[data-voix]');
choixVoix.forEach((b) => b.addEventListener('click', () => {
  voix = b.dataset.voix;
  choixVoix.forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
  if (!sonActif) boutonSon.click(); // choisir une voix, c'est vouloir l'entendre
  const a = lecture?.a;
  if (a && !a.paused && !a.ended) lancer(a.duration ? a.currentTime / a.duration : 0);
}));

function chant(ctx, sortie) {
  // Une phrase d'oiseau : quelques notes aiguës et rapides, glissées, placées à gauche ou à droite.
  const t0 = ctx.currentTime + 0.05;
  const pan = new StereoPannerNode(ctx, { pan: Math.random() * 1.6 - 0.8 });
  pan.connect(sortie);
  const trille = Math.random() < 0.5;
  const notes = trille ? 5 + Math.floor(Math.random() * 6) : 2 + Math.floor(Math.random() * 3);
  const base = 2600 + Math.random() * 1800;
  let t = t0;
  for (let i = 0; i < notes; i++) {
    const d = trille ? 0.045 + Math.random() * 0.02 : 0.12 + Math.random() * 0.1;
    const o = new OscillatorNode(ctx, { type: 'sine' });
    const g = new GainNode(ctx, { gain: 0 });
    const f = base * (trille ? 1 + Math.random() * 0.15 : 0.8 + Math.random() * 0.5);
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * (trille ? 1.35 : 0.7 + Math.random() * 0.8), t + d);
    g.gain.linearRampToValueAtTime(0.5, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g).connect(pan);
    o.start(t);
    o.stop(t + d + 0.02);
    t += d + (trille ? 0.02 : 0.06 + Math.random() * 0.08);
  }
  setTimeout(() => (sonActif ? chant(ctx, sortie) : (audio.chante = false)), (t - ctx.currentTime) * 1000 + 700 + Math.random() * 2600);
}

function lancerOiseaux() {
  if (!sonActif || audio.chante || audio.ctx.state !== 'running') return;
  audio.chante = true;
  chant(audio.ctx, audio.oiseaux);
  setTimeout(() => sonActif && chant(audio.ctx, audio.oiseaux), 900);
}

function allumerSon() {
  if (!audio) {
    const ctx = new AudioContext();
    const maitre = new GainNode(ctx, { gain: 0.06 });
    const oiseaux = new GainNode(ctx, { gain: 1 });
    oiseaux.connect(maitre).connect(ctx.destination);
    audio = { ctx, oiseaux, chante: false };
    ctx.onstatechange = lancerOiseaux;
  }
  audio.ctx.resume().catch(() => {});
  lancerOiseaux();
}

const gestes = ['pointerdown', 'keydown', 'touchstart'];
function auPremierGeste() {
  gestes.forEach((g) => removeEventListener(g, auPremierGeste, true));
  if (sonActif) allumerSon();
}
gestes.forEach((g) => addEventListener(g, auPremierGeste, true));
allumerSon();

boutonSon.addEventListener('click', () => {
  sonActif = !sonActif;
  boutonSon.setAttribute('aria-label', sonActif ? 'Couper le son' : 'Remettre le son');
  boutonSon.classList.toggle('muet', !sonActif);
  if (sonActif) return allumerSon();
  lecture?.a?.pause();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  audio?.ctx.suspend();
});

// ---------- Sous-titre ----------
// Affiche une phrase du brief et l'allume mot à mot, au rythme de la voix si le son est activé.
function dire(cle) {
  const texte = BRIEF[cle];
  phrase.replaceChildren(...texte.split(' ').flatMap((mot, i) => {
    const s = document.createElement('span');
    s.className = 'm';
    s.textContent = mot;
    return i ? [' ', s] : [s];
  }));
  const mots = [...phrase.querySelectorAll('.m')];
  const allumer = (fraction) => mots.forEach((m, k) => k <= fraction * mots.length && m.classList.add('dit'));
  const voix = jouer(cle, texte, allumer);
  if (voix) {
    return Promise.race([voix, pause(texte.length * 110 + 2500)]).then(() => {
      allumer(1);
      return pause(350);
    });
  }
  return new Promise((fini) => {
    let i = 0;
    const t = setInterval(() => {
      if (i < mots.length) mots[i++].classList.add('dit');
      else { clearInterval(t); setTimeout(fini, 500); }
    }, 230);
  });
}

// ---------- Téléphone et micro ----------
function remplir(app) {
  const ic = `<i style="background:${app.fond}${app.encre ? `;color:${app.encre}` : ''}"><svg><use href="#${app.icone}"/></svg></i>`;
  appli.innerHTML = `<header>${ic}<span>${app.nom}</span></header><ul class="lignes">${app.lignes
    .map(([t, d, cle]) => `<li${cle ? ' data-cle' : ''}><b>${t}</b><span>${d}</span></li>`).join('')}</ul>`;
}

async function envol(ligne, texte) {
  const s = scene.getBoundingClientRect();
  const r = ligne.getBoundingClientRect();
  const o = orbe.getBoundingClientRect();
  const puce = document.createElement('div');
  puce.className = 'envol';
  puce.textContent = texte;
  puce.style.left = `${r.left - s.left + r.width * 0.1}px`;
  puce.style.top = `${r.top - s.top + r.height * 0.15}px`;
  scene.append(puce);
  const p = puce.getBoundingClientRect();
  const dx = o.left + o.width / 2 - (p.left + p.width / 2);
  const dy = o.top + o.height / 2 - (p.top + p.height / 2);
  await fin(puce.animate([
    { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - s.height * 0.08}px) scale(0.95)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0 },
  ], { duration: 850, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' }), 850);
  puce.remove();
}

async function boucle() {
  appli.classList.remove('ouverte');
  compte.textContent = 'Ton brief sur mesure';
  orbe.classList.add('parle');
  let parole = dire('accueil');
  let n = 0;
  for (const app of APPS) {
    const icone = ecran.querySelector(`[data-app="${app.nom}"]`);
    const e = ecran.getBoundingClientRect();
    const i = icone.getBoundingClientRect();
    appli.style.setProperty('--ox', `${i.left + i.width / 2 - e.left}px`);
    appli.style.setProperty('--oy', `${i.top + i.height / 2 - e.top}px`);
    icone.classList.add('tape');
    await pause(220);
    remplir(app);
    appli.classList.add('ouverte');
    await pause(550);
    const ligne = appli.querySelector('[data-cle]');
    ligne.classList.add('cle');
    await pause(500);
    await parole; // la phrase précédente se termine avant la suivante
    await envol(ligne, app.puce);
    n += 1;
    compte.textContent = `${n} info${n > 1 ? 's' : ''} dans ton brief`;
    orbe.classList.add('avale');
    parole = dire(app.nom);
    await pause(180);
    orbe.classList.remove('avale');
    appli.classList.remove('ouverte');
    icone.classList.remove('tape');
    await pause(300);
  }
  await parole;
  compte.textContent = 'Belle journée !';
  await dire('fin');
  orbe.classList.remove('parle');
  await pause(1200);
  boucle();
}

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) boucle();
