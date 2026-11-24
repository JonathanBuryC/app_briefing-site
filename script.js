// Dates du jour dans les maquettes
const auj = new Date();
const fr = (o) => auj.toLocaleDateString('fr-FR', o);
document.querySelectorAll('[data-date]').forEach((el) => (el.textContent = fr({ weekday: 'long', day: 'numeric', month: 'long' })));
document.querySelectorAll('[data-jour]').forEach((el) => {
  const j = fr({ weekday: 'long' });
  el.textContent = j.charAt(0).toUpperCase() + j.slice(1);
});
document.querySelectorAll('[data-jour-mois]').forEach((el) => (el.textContent = fr({ day: 'numeric', month: 'long' })));

// La scène : le téléphone ouvre tes applis une à une, l'info importante est surlignée
// puis collectée par le micro de l'IA, qui en fait un brief et le dit dans le casque.
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
  { nom: 'Mails', fond: '#5b5fd6', icone: 'i-mail', statut: 'Je lis tes mails…', puce: 'Devis avant jeudi',
    lignes: [['Imprimerie Duval', 'Devis à valider avant jeudi', true], ['Boutique Mode', '-40 % ce week-end'], ['Sarah Martin', 'Planning de décembre']] },
  { nom: 'Agenda', fond: '#2b2e8c', icone: 'i-cal', statut: 'Je regarde ton agenda…', puce: '9 h 30 : point d’équipe',
    lignes: [['09:30', 'Point d’équipe, salle B', true], ['12:30', 'Déjeuner avec Hugo'], ['18:00', 'Sport']] },
  { nom: 'Météo', fond: '#7fa7e8', icone: 'i-pluie', statut: 'Je vérifie la météo…', puce: 'Pluie à 18 h',
    lignes: [['Ce matin', '9°, nuageux'], ['18 h', 'Pluie, prends un parapluie', true], ['Demain', '11°, soleil']] },
  { nom: 'Trafic', fond: '#ffd23f', encre: '#17183b', icone: 'i-metro', statut: 'Je regarde ton trajet…', puce: 'Ligne 13 : +10 min',
    lignes: [['Ligne 13', '10 min de retard', true], ['RER B', 'Trafic normal'], ['Bus 95', 'Trafic normal']] },
  { nom: 'Factures', fond: '#3fae8c', icone: 'i-facture', statut: 'Je fais le tour de tes factures…', puce: 'EDF avant vendredi',
    lignes: [['EDF', '64 € à payer avant vendredi', true], ['Box internet', 'Payée'], ['Assurance', 'Le 12 décembre']] },
];
const BRIEF = 'Point d’équipe à 9 h 30, ligne 13 en retard, pluie à 18 h et facture EDF avant vendredi.';

function dire(texte, ms = 260) {
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
      else { clearInterval(t); setTimeout(fini, 900); }
    }, ms);
  });
}

function statut(texte) {
  phrase.textContent = texte;
}

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
  orbe.classList.remove('parle');
  compte.textContent = 'Ton brief sur mesure';
  await pause(500);
  let n = 0;
  for (const app of APPS) {
    statut(app.statut);
    const icone = ecran.querySelector(`[data-app="${app.nom}"]`);
    const e = ecran.getBoundingClientRect();
    const i = icone.getBoundingClientRect();
    appli.style.setProperty('--ox', `${i.left + i.width / 2 - e.left}px`);
    appli.style.setProperty('--oy', `${i.top + i.height / 2 - e.top}px`);
    icone.classList.add('tape');
    await pause(220);
    remplir(app);
    appli.classList.add('ouverte');
    await pause(600);
    const ligne = appli.querySelector('[data-cle]');
    ligne.classList.add('cle');
    await pause(650);
    await envol(ligne, app.puce);
    n += 1;
    compte.textContent = `${n} info${n > 1 ? 's' : ''} pour ton brief`;
    orbe.classList.add('avale');
    await pause(180);
    orbe.classList.remove('avale');
    appli.classList.remove('ouverte');
    icone.classList.remove('tape');
    await pause(380);
  }
  compte.textContent = 'Ton brief est prêt';
  orbe.classList.add('parle');
  await dire(BRIEF);
  await pause(600);
  boucle();
}

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) boucle();
