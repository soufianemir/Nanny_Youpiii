import { loadState, saveState, resetState, nowIso, isoDate } from './state.js';
import { icon, fmtTime, fmtDuration, escapeHtml } from './templates.js';

let state = loadState();
const app = document.querySelector('#app');
const sheetRoot = document.querySelector('#sheet-root');
const toastRoot = document.querySelector('#toast-root');

function uid(prefix='id'){ return `${prefix}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`; }
function toast(message){ toastRoot.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`; setTimeout(()=>toastRoot.innerHTML='',2200); }
function commit(message){ saveState(state); render(); if(message) toast(message); }
function currentNap(){
  const starts = state.events.filter(e=>e.type==='nap_start');
  const ends = state.events.filter(e=>e.type==='nap_end');
  const lastStart = starts.at(-1);
  if(!lastStart) return null;
  const endAfter = ends.find(e=>new Date(e.at)>new Date(lastStart.at));
  return endAfter ? null : lastStart;
}
function activeOuting(){
  const start = [...state.events].reverse().find(e=>e.type==='outing_start');
  if(!start) return null;
  const end = state.events.find(e=>e.type==='outing_end' && new Date(e.at)>new Date(start.at));
  return end ? null : start;
}
function walletSpent(){ return state.wallet.movements.reduce((a,m)=>a + (m.kind==='expense'?m.amount:0),0); }
function walletBalance(){ return state.wallet.initial - walletSpent(); }
function reimbursementTotal(){ return state.reimbursements.filter(r=>r.status!=='reimbursed').reduce((a,r)=>a+r.amount,0); }
function eventMeta(e){
  const map = {
    care_start:['👋','Aurore commence sa garde','La journée est lancée'],
    care_end:['👋','Fin de garde','Passation disponible'],
    nap_start:['😴','Sieste','Constance s’est endormie'],
    nap_end:['☀️','Réveil',e.duration || 'Sieste terminée'],
    outing_start:['🌳',e.place || 'Sortie',e.location ? 'Lieu partagé' : 'Sortie enregistrée'],
    outing_end:['🏠','Retour','De retour de sortie'],
    meal_adjustment:['🍌',`Adaptation · ${e.mealLabel || 'Repas'}`,e.text || 'Menu adapté'],
    task_exception:['⚠️',e.taskLabel || 'Tâche non faite',e.text || 'Exception signalée'],
    note:['ℹ️','À savoir',e.text],
    incident:['⚠️','Incident',e.text],
    moment:['✨','Bon moment',e.text],
    expense:['💶',e.label || 'Dépense',`${e.amount.toFixed(2).replace('.',',')} € · ${e.payment==='wallet'?'Caisse famille':'À rembourser'}`],
    shopping:['🛒','Courses',`${e.item} ajouté`]
  };
  return map[e.type] || ['•','Événement',e.text || ''];
}

function header(){
  return `<header class="topbar"><div class="topbar-inner">
    <div class="brand-lockup"><div class="brand-mark">Y!</div><div><div class="brand-name">Nanny Youpiii</div><div class="brand-kicker">La journée, sans avoir à demander</div></div></div>
    <div class="role-switch" aria-label="Changer de rôle de démonstration">
      <button data-role="parent" class="${state.role==='parent'?'active':''}">Parent</button>
      <button data-role="nanny" class="${state.role==='nanny'?'active':''}">Aurore</button>
    </div>
  </div></header>`;
}

function bottomNav(){
  const items = [['today','home','Aujourd’hui'],['calendar','calendar','Calendrier'],['history','history','Historique'],['family','family','Famille']];
  return `<nav class="bottom-nav">${items.map(([id,ic,label])=>`<button class="nav-btn ${state.activeTab===id?'active':''}" data-tab="${id}">${icon(ic)}<span>${label}</span></button>`).join('')}</nav>`;
}

function currentStatus(){
  const nap = currentNap(); if(nap) return {icon:'😴',title:'Sieste',meta:`depuis ${fmtTime(nap.at)}`,image:'/assets/family.svg'};
  const outing = activeOuting(); if(outing) return {icon:'🌳',title:outing.place || 'En sortie',meta:outing.location?'Position partagée':'sortie en cours',image:'/assets/park.svg'};
  if(state.careSession?.status==='active') return {icon:'🏡',title:'À la maison',meta:`avec Aurore depuis ${fmtTime(state.careSession.startedAt)}`,image:'/assets/family.svg'};
  return {icon:'☀️',title:'Journée à venir',meta:`Aurore · ${state.schedule.plannedStart} → ${state.schedule.plannedEnd}`,image:'/assets/family.svg'};
}

function nextPlan(){
  const now = new Date();
  const nowMins = now.getHours()*60 + now.getMinutes();
  const plans = state.plans.map(p=>({p,mins:Number(p.time.split(':')[0])*60+Number(p.time.split(':')[1])})).sort((a,b)=>a.mins-b.mins);
  return plans.find(x=>x.mins>=nowMins)?.p || plans.find(x=>x.p.kind==='meal')?.p || plans[0]?.p;
}

function todayHero(){
  const active = state.careSession?.status==='active';
  if(state.role==='nanny'){
    return `<div class="hero"><section class="hero-card">
      <div class="eyebrow"><span class="status-dot"></span>${active?'Garde en cours':'Aujourd’hui'}</div>
      <h1>Bonjour Aurore 👋</h1>
      <p class="hero-sub">${active ? `Constance est avec toi depuis ${fmtTime(state.careSession.startedAt)}. L’app ne te demande rien tant que tout se passe comme prévu.` : `Ta garde est prévue de ${state.schedule.plannedStart} à ${state.schedule.plannedEnd}. Voici seulement ce qu’il faut retenir.`}</p>
      <div class="hero-actions">${active?`<button class="btn btn-primary" data-action="end-care">Terminer la garde</button><button class="btn btn-soft" data-action="open-add">＋ Ajouter</button>`:`<button class="btn btn-brand" data-action="start-care">Commencer ma garde</button><button class="btn btn-soft" data-action="briefing">Voir le briefing</button>`}</div>
    </section><div class="hero-visual"><img src="/assets/family.svg" alt="Illustration d'une nounou avec un enfant"></div></div>`;
  }
  return `<div class="hero"><section class="hero-card">
    <div class="eyebrow"><span class="status-dot"></span>${active?'Tout va bien':'Journée prévue'}</div>
    <h1>${state.child.name}</h1>
    <p class="hero-sub">${active?`Avec Aurore depuis ${fmtTime(state.careSession.startedAt)}. Les adaptations et problèmes éventuels apparaissent ici automatiquement.`:`Aurore est prévue aujourd’hui de ${state.schedule.plannedStart} à ${state.schedule.plannedEnd}.`}</p>
    <div class="hero-actions"><button class="btn btn-primary" data-action="briefing">Voir le programme</button><button class="btn btn-soft" data-action="meals">Repas du jour</button></div>
  </section><div class="hero-visual"><img src="/assets/family.svg" alt="Illustration chaleureuse d'une nounou avec un enfant"></div></div>`;
}

function nowCard(){
  const s=currentStatus(); const next=nextPlan();
  return `<section class="card now-card"><div class="now-cover"><img src="${s.image}" alt="Illustration de la journée"></div><div class="now-body">
    <div class="now-main"><div class="now-icon">${s.icon}</div><div class="now-copy"><div class="now-label">Maintenant</div><div class="now-title">${escapeHtml(s.title)}</div><div class="now-meta">${escapeHtml(s.meta)}</div></div>${activeOuting()&&state.role==='nanny'?`<button class="mini-btn" data-action="end-outing">Retour</button>`:''}</div>
    ${next?`<div class="next-block"><div class="next-time">${next.time}</div><div class="next-copy"><strong>Ensuite · ${escapeHtml(next.label)}</strong><span>${escapeHtml(next.menu || next.label)}</span></div>${next.kind==='meal'&&state.role==='nanny'?`<button class="mini-btn" data-action="adjust-meal" data-id="${next.id}">Adapter</button>`:''}</div>`:''}
  </div></section>`;
}

function instructionsCard(){
  return `<section class="card"><div class="card-title-row"><div><div class="card-title">À savoir</div><div class="card-sub">Seulement l’essentiel pour aujourd’hui</div></div><span class="pill green">${state.instructions.length} infos</span></div>
    <div class="info-list">${state.instructions.map(i=>`<div class="info-row"><div class="info-emoji">${i.icon}</div><div class="info-text">${escapeHtml(i.text)}</div></div>`).join('')}</div>
  </section>`;
}

function plansCard(){
  return `<section class="card"><div class="card-title-row"><div><div class="card-title">Programme du jour</div><div class="card-sub">RAS = tout est considéré comme OK</div></div><button class="link-btn" data-action="meals">Repas</button></div>
    <div class="plan-list">${state.plans.sort((a,b)=>a.time.localeCompare(b.time)).map(p=>`<div class="plan-row"><div class="plan-time">${p.time}</div><div class="plan-copy"><strong>${p.kind==='meal'?'🍽 ':p.kind==='task'?'✓ ':''}${escapeHtml(p.label)}</strong><span>${escapeHtml(p.menu || (p.kind==='task'?'Prévu · aucune validation nécessaire':''))}</span></div><div class="plan-actions">${state.role==='nanny'&&p.kind==='meal'?`<button class="mini-btn" data-action="adjust-meal" data-id="${p.id}">Adapter</button>`:''}${state.role==='nanny'&&p.kind==='task'?`<button class="mini-btn warn" data-action="task-exception" data-id="${p.id}">Problème</button>`:''}</div></div>`).join('')}</div>
  </section>`;
}

function timelineCard(){
  const events = [...state.events].sort((a,b)=>new Date(a.at)-new Date(b.at));
  return `<section class="card"><div class="card-title-row"><div><div class="card-title">Timeline</div><div class="card-sub">Seuls les événements utiles sont enregistrés</div></div><span class="pill">${events.length}</span></div>
    ${events.length?`<div class="timeline">${events.map(e=>{const m=eventMeta(e);return `<div class="timeline-item"><div class="timeline-time">${fmtTime(e.at)}</div><div class="timeline-node"><span class="dot"></span></div><div class="timeline-content"><strong>${m[0]} ${escapeHtml(m[1])}</strong><span>${escapeHtml(m[2]||'')}</span></div></div>`}).join('')}</div>`:`<div class="empty"><div class="empty-emoji">✨</div>Aucune exception à signaler pour le moment.<br>Une journée calme reste une timeline calme.</div>`}
  </section>`;
}

function moneyCard(){
  return `<section class="card wallet"><div class="card-title-row"><div><div class="card-title">Caisse Aurore</div><div class="card-sub">Argent confié par la famille</div></div><span class="pill">${state.wallet.initial.toFixed(0)} € départ</span></div>
    <div class="wallet-balance">${walletBalance().toFixed(2).replace('.',',')} €</div>
    <div class="wallet-row"><span class="muted">Dépensé</span><strong>${walletSpent().toFixed(2).replace('.',',')} €</strong></div>
    <div class="wallet-row"><span class="muted">À rembourser à Aurore</span><strong>${reimbursementTotal().toFixed(2).replace('.',',')} €</strong></div>
    ${state.role==='nanny'?`<div style="margin-top:14px"><button class="btn btn-soft full" data-action="expense">Ajouter une dépense</button></div>`:''}
  </section>`;
}

function shoppingCard(){
  return `<section class="card"><div class="card-title-row"><div><div class="card-title">Courses</div><div class="card-sub">Liste commune</div></div><button class="link-btn" data-action="shopping-add">＋ Ajouter</button></div>
    ${state.shopping.length?state.shopping.map(i=>`<div class="shopping-row ${i.status==='DONE'?'done':''}" data-action="toggle-shopping" data-id="${i.id}"><div class="shopping-check"></div><div class="shopping-name">${escapeHtml(i.name)}</div><span class="pill">${i.source==='meal'?'repas':i.source==='nanny'?'Aurore':'parent'}</span></div>`).join(''):`<div class="empty">La liste est vide.</div>`}
  </section>`;
}

function todayPage(){
  return `${todayHero()}<div class="grid"><div class="stack">${nowCard()}${timelineCard()}</div><div class="stack">${instructionsCard()}${plansCard()}${shoppingCard()}${moneyCard()}</div></div>`;
}

function calendarPage(){
  const d=new Date(); const monday=new Date(d); const day=(d.getDay()+6)%7; monday.setDate(d.getDate()-day);
  const days=Array.from({length:7},(_,i)=>{const x=new Date(monday);x.setDate(monday.getDate()+i);return x;});
  const meals=state.plans.filter(p=>p.kind==='meal').sort((a,b)=>a.time.localeCompare(b.time));
  return `<div class="page-title"><h1>Calendrier</h1><p>Garde, repas et organisation de la semaine.</p></div>
    <div class="week-strip">${days.map(x=>`<div class="day-chip ${isoDate(x)===state.today?'active':''}"><div class="dow">${new Intl.DateTimeFormat('fr-FR',{weekday:'short'}).format(x).replace('.','')}</div><div class="dom">${x.getDate()}</div></div>`).join('')}</div>
    <div class="grid"><div class="stack"><section class="card"><div class="card-title-row"><div><div class="card-title">Aujourd’hui</div><div class="card-sub">Aurore · ${state.schedule.plannedStart} → ${state.schedule.plannedEnd}</div></div><span class="pill green">Prévu</span></div><div class="banner"><span>✓</span><div>Le planning récurrent pourra être modifié journée par journée sans casser les autres semaines.</div></div></section>
      <section class="card"><div class="card-title-row"><div><div class="card-title">Repas du jour</div><div class="card-sub">Une seule zone, tout le menu</div></div><button class="link-btn" data-action="meals">Modifier</button></div><div class="meal-day">${meals.map(m=>`<div class="meal-item"><div class="meal-time">${m.time}</div><div class="meal-menu"><strong>${escapeHtml(m.label)} · ${escapeHtml(m.menu)}</strong><span>${m.preparation==='PREPARED'?'Déjà préparé':m.preparation==='NANNY_PREP'?'À préparer par Aurore':'À donner'}</span></div></div>`).join('')}</div></section></div>
      <div class="stack"><section class="card"><div class="card-title-row"><div><div class="card-title">Semaine type</div><div class="card-sub">Pensée pour être copiée puis ajustée</div></div></div><div class="info-list"><div class="info-row"><div class="info-emoji">📅</div><div class="info-text">Lun, mar, jeu, ven · 16:00 → 18:30</div></div><div class="info-row"><div class="info-emoji">🌤️</div><div class="info-text">Mercredi · 14:00 → 18:30</div></div></div></section><section class="card"><div class="card-title">Bientôt</div><div class="card-sub" style="margin-bottom:12px">Fonctions déjà prévues dans l’architecture</div><div class="info-list"><div class="info-row"><div class="info-emoji">📄</div><div class="info-text">Importer / exporter les menus Excel</div></div><div class="info-row"><div class="info-emoji">⧉</div><div class="info-text">Copier la semaine précédente</div></div></div></section></div></div>`;
}

function historyPage(){
  const liveSummary = state.careSession || state.events.length;
  const samples = [
    {date:'Hier',meta:'Garde 16:01 → 18:28 · aucun problème',icon:'✓'},
    {date:'Vendredi 7 août',meta:'Parc · goûter adapté · 8,40 € de courses',icon:'🌳'},
    {date:'Jeudi 6 août',meta:'Journée conforme au programme',icon:'✓'}
  ];
  return `<div class="page-title"><h1>Historique</h1><p>Retrouver une journée en quelques secondes.</p></div><div class="grid"><div class="stack">
    ${liveSummary?`<div class="history-day" data-tab="today"><div><strong>Aujourd’hui</strong><span>${state.events.length} événement${state.events.length>1?'s':''} utile${state.events.length>1?'s':''}</span></div><span class="pill green">En cours</span></div>`:''}
    ${samples.map(s=>`<div class="history-day"><div><strong>${s.icon} ${s.date}</strong><span>${s.meta}</span></div>${icon('chevron')}</div>`).join('')}</div><div class="stack"><section class="card"><div class="card-title">Principe Youpiii</div><div class="card-sub" style="margin-top:5px;line-height:1.5">Une journée sans événement n’est pas une journée vide : c’est une journée où tout s’est passé comme prévu.</div><div class="banner" style="margin-top:14px">✓ <div>RAS = tout va bien.</div></div></section></div></div>`;
}

function familyPage(){
  return `<div class="page-title"><h1>Famille</h1><p>Le foyer et les personnes qui partagent la journée.</p></div><div class="grid"><div class="stack"><section class="card"><div class="card-title-row"><div><div class="card-title">Famille Youpiii</div><div class="card-sub">Espace privé</div></div><span class="pill green">Démo V1</span></div>
    <div class="person-row"><div class="avatar">P</div><div class="person-copy"><strong>Parent</strong><span>Administrateur du foyer</span></div><span class="pill">Parent</span></div>
    <div class="person-row"><div class="avatar" style="background:#e6f1ea;color:#47725a">A</div><div class="person-copy"><strong>Aurore</strong><span>Nounou</span></div><span class="pill green">Nounou</span></div>
    <div class="person-row"><div class="avatar" style="background:#fff1d8;color:#966b32">C</div><div class="person-copy"><strong>Constance</strong><span>5 ans</span></div><span class="pill orange">Enfant</span></div>
    </section></div><div class="stack"><section class="card"><div class="card-title">Préférences V1</div><div class="info-list" style="margin-top:12px"><div class="info-row"><div class="info-emoji">📍</div><div class="info-text">GPS ponctuel activé · jamais de suivi permanent</div></div><div class="info-row"><div class="info-emoji">📷</div><div class="info-text">Photos personnelles désactivées en V1</div></div><div class="info-row"><div class="info-emoji">🔒</div><div class="info-text">La future base serveur isolera chaque foyer</div></div></div></section><section class="card"><div class="card-title">Démonstration</div><div class="card-sub" style="margin:5px 0 14px">Réinitialise Parent + Aurore + Constance.</div><button class="btn btn-danger-soft full" data-action="reset-demo">Réinitialiser les données</button></section></div></div>`;
}

function render(){
  const page = state.activeTab==='today'?todayPage():state.activeTab==='calendar'?calendarPage():state.activeTab==='history'?historyPage():familyPage();
  app.innerHTML = `<div class="app-shell">${header()}<main>${page}</main>${bottomNav()}${state.activeTab==='today'&&state.role==='nanny'?`<button class="fab" data-action="open-add" aria-label="Ajouter">${icon('plus')}</button>`:''}</div>`;
}

function openSheet(content){ sheetRoot.innerHTML=`<div class="sheet-backdrop" data-action="close-sheet"><div class="sheet" role="dialog" aria-modal="true" onclick="event.stopPropagation()"><div class="sheet-handle"></div>${content}</div></div>`; }
function closeSheet(){ sheetRoot.innerHTML=''; }
function sheetHeader(title,sub=''){ return `<div class="sheet-header"><div><div class="sheet-title">${title}</div>${sub?`<div class="sheet-sub">${sub}</div>`:''}</div><button class="close-btn" data-action="close-sheet">${icon('x')}</button></div>`; }

function addMenuSheet(){
  const nap=currentNap(); const outing=activeOuting();
  openSheet(`${sheetHeader('Ajouter','Seulement ce qui mérite d’être transmis')}<div class="action-grid">
    ${nap?`<button class="action-tile" data-action="end-nap"><span class="emoji">☀️</span><strong>Réveil</strong><span>Terminer la sieste en cours</span></button>`:`<button class="action-tile" data-action="start-nap"><span class="emoji">😴</span><strong>Sieste</strong><span>Démarrer maintenant</span></button>`}
    ${outing?`<button class="action-tile" data-action="end-outing"><span class="emoji">🏠</span><strong>Retour</strong><span>Terminer la sortie</span></button>`:`<button class="action-tile" data-action="outing"><span class="emoji">🌳</span><strong>Sortie</strong><span>Parc, promenade, bibliothèque…</span></button>`}
    <button class="action-tile" data-action="note"><span class="emoji">ℹ️</span><strong>À savoir</strong><span>Une information utile aux parents</span></button>
    <button class="action-tile" data-action="moment"><span class="emoji">✨</span><strong>Bon moment</strong><span>Quelque chose de sympa à partager</span></button>
    <button class="action-tile" data-action="incident"><span class="emoji">⚠️</span><strong>Incident</strong><span>Un problème à signaler</span></button>
    <button class="action-tile" data-action="expense"><span class="emoji">💶</span><strong>Dépense</strong><span>Caisse ou argent avancé</span></button>
    <button class="action-tile" data-action="shopping-add"><span class="emoji">🛒</span><strong>Courses</strong><span>Ajouter quelque chose qui manque</span></button>
    <button class="action-tile" data-action="meals"><span class="emoji">🍽</span><strong>Repas</strong><span>Voir ou adapter le menu prévu</span></button>
  </div>`);
}

function briefingSheet(){
  const meals=state.plans.filter(p=>p.kind==='meal');
  openSheet(`${sheetHeader('Briefing du jour',`${state.schedule.plannedStart} → ${state.schedule.plannedEnd} · Constance`)}
    <div class="info-list">${state.instructions.map(i=>`<div class="info-row"><div class="info-emoji">${i.icon}</div><div class="info-text">${escapeHtml(i.text)}</div></div>`).join('')}</div>
    <div class="sheet-section"><div class="card-title">🍽 Repas prévus</div><div class="meal-day" style="margin-top:10px">${meals.map(m=>`<div class="meal-item"><div class="meal-time">${m.time}</div><div class="meal-menu"><strong>${escapeHtml(m.menu)}</strong><span>${m.preparation==='PREPARED'?'Déjà préparé':m.preparation==='NANNY_PREP'?'À préparer par Aurore':'À donner'}</span></div></div>`).join('')}</div></div>
    ${state.role==='nanny'&&!state.careSession?`<button class="btn btn-brand full" data-action="start-care">Commencer ma garde</button>`:''}`);
}

function mealsSheet(){
  const meals=state.plans.filter(p=>p.kind==='meal').sort((a,b)=>a.time.localeCompare(b.time));
  openSheet(`${sheetHeader('Repas du jour','Une seule liste. Si tout se passe comme prévu, Aurore ne saisit rien.')}<div class="meal-day">${meals.map(m=>`<div class="meal-item"><div class="meal-time">${m.time}</div><div class="meal-menu"><strong>${escapeHtml(m.label)} · ${escapeHtml(m.menu)}</strong><span>${m.preparation==='PREPARED'?'Déjà préparé':m.preparation==='NANNY_PREP'?'À préparer par Aurore':'À donner'}</span>${state.role==='nanny'?`<div style="margin-top:8px"><button class="mini-btn" data-action="adjust-meal" data-id="${m.id}">Adapter</button></div>`:''}</div></div>`).join('')}</div>${state.role==='parent'?`<div class="sheet-section"><button class="btn btn-soft full" data-action="edit-meals">Modifier les menus</button></div>`:''}`);
}

function editMealsSheet(){
  const meals=state.plans.filter(p=>p.kind==='meal').sort((a,b)=>a.time.localeCompare(b.time));
  openSheet(`${sheetHeader('Modifier les repas','Simple et directement visible par Aurore')}<form class="form" id="meal-plan-form">${meals.map(m=>`<div class="sheet-section"><div class="field"><label>${escapeHtml(m.label)} · ${m.time}</label><input name="menu-${m.id}" value="${escapeHtml(m.menu)}"></div><div class="field"><label>Préparation</label><select name="prep-${m.id}"><option value="PREPARED" ${m.preparation==='PREPARED'?'selected':''}>Déjà préparé</option><option value="GIVE" ${m.preparation==='GIVE'?'selected':''}>À donner</option><option value="NANNY_PREP" ${m.preparation==='NANNY_PREP'?'selected':''}>À préparer par Aurore</option></select></div></div>`).join('')}<button class="btn btn-brand full" type="submit">Enregistrer les repas</button></form>`);
}

function adjustMealSheet(id){
  const meal=state.plans.find(p=>p.id===id); if(!meal)return;
  openSheet(`${sheetHeader(`Adapter · ${escapeHtml(meal.label)}`,`${meal.time} · prévu : ${escapeHtml(meal.menu)}`)}<div class="confirm-box">Le menu est une intention. Si un aliment manque, Aurore peut le remplacer, l’acheter ou signaler que le repas n’est pas possible.</div><div class="action-grid" style="margin-top:12px">
    <button class="action-tile" data-action="meal-replace" data-id="${meal.id}"><span class="emoji">🍌</span><strong>Remplacer</strong><span>Ex. banane à la place du yaourt</span></button>
    <button class="action-tile" data-action="meal-buy" data-id="${meal.id}"><span class="emoji">🛒</span><strong>Acheter</strong><span>Ajouter l’aliment manquant aux courses</span></button>
    <button class="action-tile" data-action="meal-impossible" data-id="${meal.id}"><span class="emoji">⚠️</span><strong>Impossible</strong><span>Informer simplement le parent</span></button>
  </div>`);
}

function mealReplaceSheet(id){
  const meal=state.plans.find(p=>p.id===id);
  openSheet(`${sheetHeader('Remplacer un aliment',`Prévu : ${escapeHtml(meal.menu)}`)}<form class="form" id="meal-replace-form" data-id="${id}"><div class="field"><label>Qu’est-ce qui manque ?</label><input name="missing" placeholder="Ex. Yaourt" required></div><div class="field"><label>Remplacé par</label><input name="replacement" placeholder="Ex. Banane" required></div><button class="btn btn-brand full" type="submit">Enregistrer l’adaptation</button></form>`);
}

function genericTextSheet(type,title,sub,placeholder){
  openSheet(`${sheetHeader(title,sub)}<form class="form" id="text-event-form" data-type="${type}"><div class="field"><label>Détail</label><textarea name="text" placeholder="${placeholder}" required></textarea></div><button class="btn ${type==='incident'?'btn-brand':'btn-primary'} full" type="submit">Enregistrer</button></form>`);
}

function outingSheet(){
  openSheet(`${sheetHeader('Nouvelle sortie','Le GPS est ponctuel, jamais permanent.')}<form class="form" id="outing-form"><div class="field"><label>Lieu</label><input name="place" placeholder="Parc Montsouris, bibliothèque…" required></div><label class="banner"><input type="checkbox" name="gps" checked> <div><strong>Partager ma position ponctuelle</strong><br><span class="muted">Uniquement au moment où tu démarres la sortie.</span></div></label><button class="btn btn-brand full" type="submit">Démarrer la sortie</button></form>`);
}

function expenseSheet(){
  openSheet(`${sheetHeader('Ajouter une dépense','Les parents sont informés, pas d’approbation inutile.')}<form class="form" id="expense-form"><div class="field"><label>Montant</label><input name="amount" type="number" min="0.01" step="0.01" placeholder="12,40" required></div><div class="field"><label>Achat / justification</label><input name="label" placeholder="Monoprix · yaourts et compotes" required></div><div class="field"><label>Payé avec</label><select name="payment"><option value="wallet">Caisse de la famille</option><option value="nanny">Argent d’Aurore · à rembourser</option></select></div><button class="btn btn-brand full" type="submit">Enregistrer la dépense</button></form>`);
}

function shoppingAddSheet(prefill=''){
  openSheet(`${sheetHeader('Ajouter aux courses','Visible immédiatement par le parent et Aurore.')}<form class="form" id="shopping-form"><div class="field"><label>Produit</label><input name="item" value="${escapeHtml(prefill)}" placeholder="Yaourts" required></div><button class="btn btn-brand full" type="submit">Ajouter</button></form>`);
}

function taskExceptionSheet(id){
  const task=state.plans.find(p=>p.id===id);
  openSheet(`${sheetHeader('Signaler une exception',escapeHtml(task.label))}<form class="form" id="task-exception-form" data-id="${id}"><div class="field"><label>Pourquoi ?</label><textarea name="text" placeholder="Ex. Bain non fait : Constance était très fatiguée." required></textarea></div><button class="btn btn-brand full" type="submit">Informer le parent</button></form>`);
}

function endCareSheet(){
  const exceptions=state.events.filter(e=>['task_exception','incident','meal_adjustment','note','expense'].includes(e.type));
  openSheet(`${sheetHeader('Passation','La journée résumée sans checklist inutile.')}<div class="banner"><span>✓</span><div>Tout ce qui n’est pas signalé ci-dessous est considéré comme s’étant déroulé normalement.</div></div><div class="sheet-section"><div class="card-title">Aujourd’hui</div><div class="info-list" style="margin-top:10px">${exceptions.length?exceptions.map(e=>{const m=eventMeta(e);return `<div class="info-row"><div class="info-emoji">${m[0]}</div><div class="info-text"><strong>${escapeHtml(m[1])}</strong><br><span class="muted">${escapeHtml(m[2]||'')}</span></div></div>`}).join(''):`<div class="info-row"><div class="info-emoji">✨</div><div class="info-text">Aucune exception. Tout s’est passé comme prévu.</div></div>`}</div></div><button class="btn btn-primary full" data-action="confirm-end-care">Terminer et transmettre</button>`);
}

async function startOuting(place,gps){
  let location=null;
  if(gps && navigator.geolocation){
    try{
      location = await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:Math.round(p.coords.accuracy)}),reject,{enableHighAccuracy:false,timeout:6000,maximumAge:60000}));
    }catch{ toast('Position non disponible, sortie enregistrée sans GPS'); }
  }
  state.events.push({id:uid('evt'),type:'outing_start',at:nowIso(),place,location}); closeSheet(); commit(location?'Sortie démarrée · lieu partagé':'Sortie démarrée');
}

function doAction(el){
  const action=el.dataset.action; const id=el.dataset.id;
  if(action==='close-sheet'){closeSheet();return}
  if(action==='open-add'){addMenuSheet();return}
  if(action==='briefing'){briefingSheet();return}
  if(action==='meals'){mealsSheet();return}
  if(action==='edit-meals'){editMealsSheet();return}
  if(action==='adjust-meal'){adjustMealSheet(id);return}
  if(action==='meal-replace'){mealReplaceSheet(id);return}
  if(action==='meal-buy'){
    const meal=state.plans.find(p=>p.id===id); closeSheet(); shoppingAddSheet(meal?.menu.split(/[+,]/)[0].trim() || 'Aliment manquant'); return;
  }
  if(action==='meal-impossible'){
    const meal=state.plans.find(p=>p.id===id); state.events.push({id:uid('evt'),type:'meal_adjustment',mealLabel:meal.label,at:nowIso(),text:`Repas prévu non possible : ${meal.menu}`}); closeSheet(); commit('Parent informé'); return;
  }
  if(action==='start-care'){
    state.careSession={id:uid('care'),status:'active',startedAt:nowIso(),plannedStart:state.schedule.plannedStart,plannedEnd:state.schedule.plannedEnd}; state.events.push({id:uid('evt'),type:'care_start',at:state.careSession.startedAt}); closeSheet(); commit('Garde commencée'); return;
  }
  if(action==='end-care'){endCareSheet();return}
  if(action==='confirm-end-care'){
    const at=nowIso(); state.careSession={...state.careSession,status:'ended',endedAt:at};state.events.push({id:uid('evt'),type:'care_end',at}); state.history.unshift({date:state.today,events:[...state.events],careSession:{...state.careSession}});closeSheet();commit('Passation transmise au parent');return;
  }
  if(action==='start-nap'){state.events.push({id:uid('evt'),type:'nap_start',at:nowIso()});closeSheet();commit('Sieste démarrée');return}
  if(action==='end-nap'){
    const nap=currentNap(); if(nap){const at=nowIso();state.events.push({id:uid('evt'),type:'nap_end',at,duration:fmtDuration(nap.at,at)});closeSheet();commit('Réveil enregistré');}return;
  }
  if(action==='outing'){outingSheet();return}
  if(action==='end-outing'){state.events.push({id:uid('evt'),type:'outing_end',at:nowIso()});closeSheet();commit('Retour enregistré');return}
  if(action==='note'){genericTextSheet('note','À savoir','Une information utile, sans notion d’alerte.','Ex. Il n’y a presque plus de compotes.');return}
  if(action==='moment'){genericTextSheet('moment','Bon moment','Un petit souvenir sans photo.','Ex. Constance était très fière d’avoir réussi ses lacets.');return}
  if(action==='incident'){genericTextSheet('incident','Signaler un incident','Pas de diagnostic : seulement les faits utiles.','Ex. Constance est tombée au parc, petite égratignure au genou.');return}
  if(action==='expense'){expenseSheet();return}
  if(action==='shopping-add'){shoppingAddSheet();return}
  if(action==='task-exception'){taskExceptionSheet(id);return}
  if(action==='toggle-shopping'){
    const item=state.shopping.find(i=>i.id===id);if(item){item.status=item.status==='DONE'?'TODO':'DONE';commit(item.status==='DONE'?'Course marquée achetée':'Course remise à acheter')}return;
  }
  if(action==='reset-demo'){state=resetState();closeSheet();render();toast('Démo réinitialisée');return}
}

document.addEventListener('click',(ev)=>{
  const role=ev.target.closest('[data-role]'); if(role){state.role=role.dataset.role;state.activeTab='today';commit();return}
  const tab=ev.target.closest('[data-tab]'); if(tab){state.activeTab=tab.dataset.tab;commit();return}
  const actionEl=ev.target.closest('[data-action]'); if(actionEl) doAction(actionEl);
});

document.addEventListener('submit',async(ev)=>{
  ev.preventDefault(); const f=ev.target; const fd=new FormData(f);
  if(f.id==='meal-plan-form'){
    state.plans.filter(p=>p.kind==='meal').forEach(m=>{m.menu=fd.get(`menu-${m.id}`)?.toString().trim()||m.menu;m.preparation=fd.get(`prep-${m.id}`)||m.preparation});closeSheet();commit('Repas mis à jour pour Aurore');return;
  }
  if(f.id==='meal-replace-form'){
    const meal=state.plans.find(p=>p.id===f.dataset.id);const missing=fd.get('missing').toString().trim();const replacement=fd.get('replacement').toString().trim();state.events.push({id:uid('evt'),type:'meal_adjustment',mealLabel:meal.label,at:nowIso(),text:`${replacement} à la place de ${missing} · ${missing} indisponible`}); if(!state.shopping.some(i=>i.name.toLowerCase()===missing.toLowerCase()&&i.status!=='DONE')) state.shopping.push({id:uid('shop'),name:missing,status:'TODO',source:'meal'}); closeSheet();commit(`${missing} ajouté aux courses`);return;
  }
  if(f.id==='text-event-form'){
    const type=f.dataset.type; state.events.push({id:uid('evt'),type,at:nowIso(),text:fd.get('text').toString().trim()});closeSheet();commit(type==='incident'?'Incident transmis':'Information ajoutée');return;
  }
  if(f.id==='outing-form'){await startOuting(fd.get('place').toString().trim(),fd.get('gps')==='on');return}
  if(f.id==='expense-form'){
    const amount=Number(fd.get('amount'));const label=fd.get('label').toString().trim();const payment=fd.get('payment').toString();state.events.push({id:uid('evt'),type:'expense',at:nowIso(),amount,label,payment});if(payment==='wallet')state.wallet.movements.push({id:uid('mov'),kind:'expense',amount,label,at:nowIso()});else state.reimbursements.push({id:uid('reim'),amount,label,at:nowIso(),status:'due'});closeSheet();commit('Dépense enregistrée');return;
  }
  if(f.id==='shopping-form'){
    const item=fd.get('item').toString().trim();state.shopping.push({id:uid('shop'),name:item,status:'TODO',source:state.role==='nanny'?'nanny':'parent'});state.events.push({id:uid('evt'),type:'shopping',at:nowIso(),item});closeSheet();commit('Ajouté aux courses');return;
  }
  if(f.id==='task-exception-form'){
    const task=state.plans.find(p=>p.id===f.dataset.id);state.events.push({id:uid('evt'),type:'task_exception',at:nowIso(),taskLabel:task.label,text:fd.get('text').toString().trim()});closeSheet();commit('Exception transmise au parent');return;
  }
});

if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{})); }
render();