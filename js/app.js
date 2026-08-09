import {
  loadState, saveState, resetState, isoDate, parseDate, addDays, mondayOf,
  getScheduleForDate, ensureDay, dayRecord, visiblePlansForDate, isTimeWithin, walletSummary
} from './state.js';

let state = loadState();
const app = document.querySelector('#app');
const sheetRoot = document.querySelector('#sheet-root');
const toastRoot = document.querySelector('#toast-root');

const uid = (p='id') => `${p}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
const esc = (v='') => String(v).replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const fmtMoney = n => `${Number(n || 0).toFixed(2).replace('.',',')} €`;
const fmtTime = at => new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date(at));
const fmtDate = (date, opts={weekday:'long',day:'numeric',month:'long'}) => new Intl.DateTimeFormat('fr-FR',opts).format(parseDate(date));
const today = () => isoDate();
const isParent = () => state.session.actorRole === 'PARENT';
const isNanny = () => state.session.actorRole === 'NANNY';
const viewingParent = () => state.session.viewRole === 'PARENT';
const viewingNanny = () => state.session.viewRole === 'NANNY';
const nannyCanAct = () => isNanny() && viewingNanny();
const parentCanManage = () => isParent() && viewingParent();
const nannyPreview = () => isParent() && viewingNanny();

function toast(message){
  toastRoot.innerHTML = `<div class="toast">${esc(message)}</div>`;
  setTimeout(() => toastRoot.innerHTML = '', 2200);
}
function commit(message){ saveState(state); render(); if(message) toast(message); }
function closeSheet(){ sheetRoot.innerHTML=''; }
function openSheet(content){ sheetRoot.innerHTML=`<div class="sheet-backdrop"><div class="sheet" role="dialog" aria-modal="true"><div class="handle"></div>${content}</div></div>`; }
function sheetHead(title,sub=''){ return `<div class="sheet-head"><div><div class="sheet-title">${esc(title)}</div>${sub?`<div class="sheet-sub">${esc(sub)}</div>`:''}</div><button class="close" data-action="close-sheet" aria-label="Fermer">×</button></div>`; }

const walletStats = () => walletSummary(state);
function purchasesForDate(date){ return state.purchases.filter(p=>p.date===date).sort((a,b)=>new Date(b.at)-new Date(a.at)); }
function eventsForDate(date){ return [...dayRecord(state,date).events].sort((a,b)=>new Date(a.at)-new Date(b.at)); }
function currentNap(date=today()){
  const ev=eventsForDate(date); let active=null;
  for(const e of ev){ if(e.type==='NAP_START') active=e; if(e.type==='NAP_END') active=null; }
  return active;
}
function activeOuting(date=today()){
  const ev=eventsForDate(date); let active=null;
  for(const e of ev){ if(e.type==='OUTING_START') active=e; if(e.type==='OUTING_END') active=null; }
  return active;
}
function nextWorkingDate(from=today()){
  for(let i=0;i<21;i++){
    const date=addDays(from,i===0?0:i);
    if(getScheduleForDate(state,date).enabled) return date;
  }
  return null;
}
function eventMeta(e){
  switch(e.type){
    case 'CARE_START': return ['👋','Début de garde','Aurore est arrivée'];
    case 'CARE_END': return ['👋','Fin de garde','Passation terminée'];
    case 'NAP_START': return ['😴','Sieste','Constance s’est endormie'];
    case 'NAP_END': return ['☀️','Réveil',e.text || 'Sieste terminée'];
    case 'OUTING_START': return ['🌳',e.place || 'Sortie',e.location?'Lieu partagé ponctuellement':'Sortie enregistrée'];
    case 'OUTING_END': return ['🏠','Retour','Fin de la sortie'];
    case 'MEAL_ADJUSTMENT': return ['🍽',`Adaptation · ${e.label || 'Repas'}`,e.text || 'Menu adapté'];
    case 'TASK_EXCEPTION': return ['⚠️',e.label || 'Tâche non faite',e.text || 'Exception signalée'];
    case 'NOTE': return ['ℹ️','À savoir',e.text || ''];
    case 'INCIDENT': return ['⚠️','Incident',e.text || ''];
    case 'MOMENT': return ['✨','Bon moment',e.text || ''];
    case 'PURCHASE': return ['🛒',e.label || 'Achat',fmtMoney(e.amount)];
    case 'OUTING': return ['🌳','Sortie',e.text || ''];
    default: return ['•','Événement',e.text || ''];
  }
}

function header(){
  const switcher = isParent()
    ? `<div class="view-switch" aria-label="Choisir la vue"><button class="${viewingParent()?'active':''}" data-view="PARENT">Parent</button><button class="${viewingNanny()?'active':''}" data-view="NANNY">Vue Aurore</button></div>`
    : `<div class="view-switch"><button class="active">Aurore</button></div>`;
  return `<header class="topbar"><div class="topbar-inner"><div class="brand"><div class="brand-mark">Y!</div><div><div class="brand-name">Nanny Youpiii <span class="pill amber">V2</span></div><div class="brand-sub">La journée, organisée sans friction</div></div></div>${switcher}</div></header>`;
}
function previewBanner(){
  if(!nannyPreview()) return '';
  return `<div class="preview-banner">👀 <div><strong>Aperçu Parent.</strong> Tu vois exactement l’interface d’Aurore, mais sans pouvoir agir à sa place.</div></div>`;
}
function bottomNav(){
  const items = viewingParent()
    ? [['today','🏠','Aujourd’hui'],['calendar','📅','Calendrier'],['history','🕘','Historique'],['family','👨‍👩‍👧','Famille']]
    : [['today','☀️','Aujourd’hui'],['calendar','📅','Planning'],['history','🕘','Historique'],['family','👤','Profil']];
  return `<nav class="bottom-nav">${items.map(([id,ico,label])=>`<button class="nav ${state.activeTab===id?'active':''}" data-tab="${id}"><span class="ico">${ico}</span><span>${label}</span></button>`).join('')}</nav>`;
}

function parentHero(){
  const date=today(), schedule=getScheduleForDate(state,date), day=dayRecord(state,date);
  if(!schedule.enabled){
    const next=nextWorkingDate(addDays(date,1));
    const ns=next?getScheduleForDate(state,next):null;
    return `<div class="hero"><section class="hero-card"><div class="eyebrow"><span class="dot"></span>Aujourd’hui</div><h2>Pas de garde prévue</h2><div class="hero-copy">Aurore ne travaille pas aujourd’hui. ${next?`Prochaine garde ${fmtDate(next,{weekday:'long',day:'numeric',month:'long'})} · ${ns.start} → ${ns.end}.`:''}</div><div class="hero-actions"><button class="btn btn-primary" data-action="open-calendar-date" data-date="${next||date}">Préparer la prochaine garde</button><button class="btn btn-soft" data-view="NANNY">Voir comme Aurore</button></div></section><div class="hero-visual"><img src="./assets/family.svg" alt="Nounou et enfant"></div></div>`;
  }
  const care=day.careSession;
  const eyebrow=care?.status==='ACTIVE'?'Garde en cours':care?.status==='ENDED'?'Garde terminée':'Garde prévue';
  const copy=care?.status==='ACTIVE'?`Constance est avec Aurore depuis ${fmtTime(care.startedAt)}. Les écarts importants apparaissent automatiquement.`:`Aurore est prévue de ${schedule.start} à ${schedule.end}. Tu peux préparer son programme depuis le calendrier.`;
  return `<div class="hero"><section class="hero-card"><div class="eyebrow"><span class="dot"></span>${eyebrow}</div><h2>Constance</h2><div class="hero-copy">${copy}</div><div class="hero-actions"><button class="btn btn-primary" data-action="open-calendar-date" data-date="${date}">Programme du jour</button><button class="btn btn-soft" data-view="NANNY">Voir comme Aurore</button></div></section><div class="hero-visual"><img src="./assets/family.svg" alt="Nounou et enfant"></div></div>`;
}

function nannyHero(){
  const date=today(), schedule=getScheduleForDate(state,date), day=dayRecord(state,date), preview=nannyPreview();
  if(!schedule.enabled){
    const next=nextWorkingDate(addDays(date,1)), ns=next?getScheduleForDate(state,next):null;
    return `<div class="hero"><section class="hero-card"><div class="eyebrow"><span class="dot"></span>Aujourd’hui</div><h2>Bonjour Aurore 👋</h2><div class="hero-copy">Pas de garde aujourd’hui.${next?` Prochaine garde ${fmtDate(next,{weekday:'long',day:'numeric'})} de ${ns.start} à ${ns.end}.`:''}</div><div class="hero-actions"><button class="btn btn-soft" data-action="open-calendar-date" data-date="${next||date}">Voir le planning</button></div></section><div class="hero-visual"><img src="./assets/family.svg" alt="Aurore avec Constance"></div></div>`;
  }
  const care=day.careSession;
  if(care?.status==='ENDED') return `<div class="hero"><section class="hero-card"><div class="eyebrow"><span class="dot"></span>Garde terminée</div><h2>Merci Aurore ✨</h2><div class="hero-copy">La passation a été enregistrée. Tout ce qui n’a pas été signalé est considéré comme s’étant déroulé normalement.</div><div class="hero-actions"><button class="btn btn-primary" data-action="open-history-date" data-date="${date}">Voir la journée</button></div></section><div class="hero-visual"><img src="./assets/family.svg" alt="Aurore avec Constance"></div></div>`;
  const active=care?.status==='ACTIVE';
  return `<div class="hero"><section class="hero-card"><div class="eyebrow"><span class="dot"></span>${active?'Garde en cours':'Aujourd’hui'}</div><h2>Bonjour Aurore 👋</h2><div class="hero-copy">${active?`Avec Constance depuis ${fmtTime(care.startedAt)}. Tu ne renseignes que les adaptations, achats ou problèmes.`:`Ta garde est prévue de ${schedule.start} à ${schedule.end}. Voici uniquement ce qui te concerne.`}</div><div class="hero-actions">${!preview?active?`<button class="btn btn-primary" data-action="end-care">Terminer la garde</button><button class="btn btn-soft" data-action="open-add">＋ Ajouter</button>`:`<button class="btn btn-brand" data-action="start-care">Commencer ma garde</button><button class="btn btn-soft" data-action="briefing">Voir le briefing</button>`:`<button class="btn btn-soft" disabled>Aperçu en lecture seule</button>`}</div></section><div class="hero-visual"><img src="./assets/family.svg" alt="Aurore avec Constance"></div></div>`;
}

function programCard(date, role='PARENT', editable=false){
  const schedule=getScheduleForDate(state,date), plans=visiblePlansForDate(state,date), day=dayRecord(state,date);
  if(!schedule.enabled) return `<section class="card"><div class="card-title">Programme d’Aurore</div><div class="empty"><div class="empty-emoji">🌿</div>Pas de garde ce jour-là.</div></section>`;
  return `<section class="card"><div class="card-title-row"><div><div class="card-title">Programme d’Aurore</div><div class="card-sub">Uniquement entre ${schedule.start} et ${schedule.end}</div></div>${editable?`<button class="link" data-action="add-plan" data-date="${date}">＋ Ajouter</button>`:''}</div>
  ${day.instructions?.length?`<div class="info-list" style="margin-bottom:10px">${day.instructions.map(i=>`<div class="info-row"><div class="info-emoji">${i.icon||'ℹ️'}</div><div class="info-text">${esc(i.text)}</div></div>`).join('')}</div>`:''}
  ${plans.length?`<div class="program-list">${plans.map(p=>`<div class="program-row"><div class="program-time">${p.time}</div><div class="program-copy"><strong>${p.kind==='MEAL'?'🍽':p.kind==='TASK'?'✓':'ℹ️'} ${esc(p.label)}</strong><span>${esc(p.detail||'')}${p.kind==='MEAL'?` · ${p.preparation==='PREPARED'?'déjà préparé':p.preparation==='NANNY_PREP'?'à préparer par Aurore':'à donner'}`:''}</span></div><div class="row-actions">${editable?`<button class="mini" data-action="edit-plan" data-date="${date}" data-id="${p.id}">Modifier</button>`:role==='NANNY'&&nannyCanAct()?p.kind==='MEAL'?`<button class="mini" data-action="adjust-meal" data-date="${date}" data-id="${p.id}">Adapter</button>`:p.kind==='TASK'?`<button class="mini warn" data-action="task-exception" data-date="${date}" data-id="${p.id}">Problème</button>`:'' :''}</div></div>`).join('')}</div>`:`<div class="empty">Aucun élément prévu pendant la garde.</div>`}
  </section>`;
}

function statusCard(){
  const date=today(), schedule=getScheduleForDate(state,date), day=dayRecord(state,date), care=day.careSession;
  if(!schedule.enabled) return `<section class="card status-card"><div class="status-cover"><img src="./assets/park.svg" alt="Journée calme"></div><div class="status-body"><div class="status-main"><div class="status-icon">🌿</div><div class="status-copy"><div class="label">Maintenant</div><div class="status-title">Pas de garde</div><div class="status-meta">Aurore n’est pas prévue aujourd’hui.</div></div></div></div></section>`;
  const nap=currentNap(date), outing=activeOuting(date), plans=visiblePlansForDate(state,date);
  let icon='🏡',title=care?.status==='ACTIVE'?'À la maison':'Garde à venir',meta=care?.status==='ACTIVE'?`avec Aurore depuis ${fmtTime(care.startedAt)}`:`${schedule.start} → ${schedule.end}`;
  if(nap){icon='😴';title='Sieste';meta=`depuis ${fmtTime(nap.at)}`}
  if(outing){icon='🌳';title=outing.place||'En sortie';meta=outing.location?'lieu partagé':'sortie en cours'}
  if(care?.status==='ENDED'){icon='✓';title='Garde terminée';meta=`${fmtTime(care.startedAt)} → ${fmtTime(care.endedAt)}`}
  const nowDate=new Date(); const nowHH=`${String(nowDate.getHours()).padStart(2,'0')}:${String(nowDate.getMinutes()).padStart(2,'0')}`;
  const next=care?.status==='ENDED'?null:(care?.status==='ACTIVE'?plans.find(p=>p.time>=nowHH):plans[0]);
  return `<section class="card status-card"><div class="status-cover"><img src="${outing?'./assets/park.svg':'./assets/family.svg'}" alt="Situation actuelle"></div><div class="status-body"><div class="status-main"><div class="status-icon">${icon}</div><div class="status-copy"><div class="label">Maintenant</div><div class="status-title">${esc(title)}</div><div class="status-meta">${esc(meta)}</div></div>${outing&&nannyCanAct()?`<button class="mini" data-action="end-outing">Retour</button>`:''}</div>${next?`<div class="next"><div class="time">${next.time}</div><div><strong>Ensuite · ${esc(next.label)}</strong><span>${esc(next.detail||'')}</span></div>${next.kind==='MEAL'&&nannyCanAct()?`<button class="mini" data-action="adjust-meal" data-date="${date}" data-id="${next.id}">Adapter</button>`:''}</div>`:''}</div></section>`;
}

function shoppingCard(){
  const todo=state.shopping.filter(i=>i.status==='TODO');
  return `<section class="card"><div class="card-title-row"><div><div class="card-title">À acheter par Aurore</div><div class="card-sub">Une course achetée devient automatiquement un achat dans la caisse</div></div>${parentCanManage()||nannyCanAct()?`<button class="link" data-action="shopping-add">＋ Ajouter</button>`:''}</div>${todo.length?todo.map(i=>`<div class="purchase-row"><div class="check"></div><div class="purchase-name"><strong>${esc(i.name)}</strong><span>${esc(i.reason||'À acheter pendant une prochaine garde')}</span></div>${nannyCanAct()?`<button class="btn btn-green small" data-action="buy-shopping" data-id="${i.id}">Acheté</button>`:`<span class="pill ${i.source==='MEAL'?'amber':'blue'}">${i.source==='MEAL'?'repas':'parent'}</span>`}</div>`).join(''):`<div class="empty">Rien à acheter pour le moment.</div>`}</section>`;
}

function moneyCard(){
  const w=walletStats();
  const last=[...state.purchases].sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,3);
  return `<section class="card money-card"><div class="card-title-row"><div><div class="card-title">Achats & caisse</div><div class="card-sub">La caisse se calcule toute seule</div></div>${parentCanManage()?`<button class="btn btn-soft small" data-action="cash-topup">＋ Caisse</button>`:''}</div><div class="money-grid"><div class="money-metric"><div class="value">${fmtMoney(w.available)}</div><div class="name">Disponible</div></div><div class="money-metric"><div class="value">${fmtMoney(w.due)}</div><div class="name">À rembourser à Aurore</div></div></div><div class="ledger">${last.length?last.map(p=>`<div class="ledger-row"><span class="muted">${esc(p.label)}</span><strong>− ${fmtMoney(p.amount)}</strong></div>`).join(''):`<div class="ledger-row"><span class="muted">Aucun achat enregistré</span><strong>${fmtMoney(0)}</strong></div>`}</div>${nannyCanAct()?`<div style="margin-top:12px"><button class="btn btn-soft full" data-action="unplanned-purchase">＋ Achat imprévu</button></div>`:''}</section>`;
}

function timelineCard(date){
  const events=eventsForDate(date);
  return `<section class="card"><div class="card-title-row"><div><div class="card-title">Timeline</div><div class="card-sub">Seulement ce qui mérite d’être transmis</div></div><span class="pill">${events.length}</span></div>${events.length?`<div class="timeline">${events.map(e=>{const m=eventMeta(e);return `<div class="timeline-row"><div class="timeline-time">${fmtTime(e.at)}</div><div class="timeline-node"></div><div class="timeline-copy"><strong>${m[0]} ${esc(m[1])}</strong><span>${esc(m[2])}</span></div></div>`}).join('')}</div>`:`<div class="empty"><div class="empty-emoji">✨</div>Rien à signaler. Tout est considéré comme conforme au programme.</div>`}</section>`;
}

function parentToday(){
  return `${parentHero()}<div class="grid"><div class="stack">${statusCard()}${timelineCard(today())}</div><div class="stack">${programCard(today(),'PARENT',false)}${shoppingCard()}${moneyCard()}</div></div>`;
}
function nannyToday(){
  return `${previewBanner()}${nannyHero()}<div class="grid"><div class="stack">${statusCard()}${timelineCard(today())}</div><div class="stack">${programCard(today(),'NANNY',false)}${shoppingCard()}${moneyCard()}</div></div>`;
}

function weekDates(anchor){ return Array.from({length:7},(_,i)=>addDays(anchor,i)); }
function weekToolbar(){
  const days=weekDates(state.calendarAnchor), from=days[0], to=days[6];
  return `<div class="calendar-toolbar"><button class="btn btn-soft small" data-action="week-prev">‹</button><div class="week-label">${fmtDate(from,{day:'numeric',month:'short'})} — ${fmtDate(to,{day:'numeric',month:'short',year:'numeric'})}</div><div style="display:flex;gap:6px"><button class="btn btn-soft small" data-action="calendar-today">Aujourd’hui</button><button class="btn btn-soft small" data-action="week-next">›</button></div></div>`;
}
function weekStrip(){
  return `<div class="week-strip">${weekDates(state.calendarAnchor).map(date=>{const s=getScheduleForDate(state,date);const d=parseDate(date);return `<button class="day-chip ${date===state.selectedDate?'active':''} ${s.enabled?'has-care':''} ${date<today()?'past':''} ${date===today()?'today':''}" data-date="${date}"><div class="dow">${new Intl.DateTimeFormat('fr-FR',{weekday:'short'}).format(d).replace('.','')}</div><div class="dom">${d.getDate()}</div></button>`}).join('')}</div>`;
}
function scheduleSummaryCard(date, editable){
  const s=getScheduleForDate(state,date);
  return `<section class="card"><div class="card-title-row"><div><div class="card-title">Garde du ${fmtDate(date,{weekday:'long',day:'numeric',month:'long'})}</div><div class="card-sub">${s.source==='exception'?'Exception à la semaine type':'Issu de la semaine type'}</div></div>${editable?`<button class="link" data-action="edit-day-schedule" data-date="${date}">Modifier ce jour</button>`:''}</div><div class="schedule-summary"><div><div class="schedule-time">${s.enabled?`${s.start} → ${s.end}`:'Pas de garde'}</div><div class="schedule-label">${s.label}</div></div><span class="pill ${s.source==='exception'?'amber':'green'}">${s.source==='exception'?'Exception':'Semaine type'}</span></div></section>`;
}
function weeklyScheduleCard(editable){
  const names={'1':'Lundi','2':'Mardi','3':'Mercredi','4':'Jeudi','5':'Vendredi','6':'Samedi','0':'Dimanche'};
  const order=['1','2','3','4','5','6','0'];
  return `<section class="card"><div class="card-title-row"><div><div class="card-title">Semaine type</div><div class="card-sub">Horaires habituels d’Aurore, configurés par les parents</div></div>${editable?`<button class="link" data-action="edit-weekly-schedule">Configurer</button>`:''}</div><div class="weekly-list">${order.map(k=>{const x=state.weeklySchedule[k];return `<div class="weekly-row ${!x.enabled?'off':''}"><strong>${names[k]}</strong><span>${x.enabled?`${x.start} → ${x.end}`:'Pas de garde'}</span>${x.enabled?'<span class="pill green">Prévu</span>':'<span class="pill">Repos</span>'}</div>`}).join('')}</div></section>`;
}
function parentCalendar(){
  const date=state.selectedDate;
  return `<div class="page-head"><div><h1>Calendrier</h1><p>Les parents préparent la garde jour par jour à partir de la semaine type.</p></div></div>${weekToolbar()}${weekStrip()}<div class="grid"><div class="stack">${scheduleSummaryCard(date,true)}${programCard(date,'PARENT',true)}</div><div class="stack">${weeklyScheduleCard(true)}<section class="card"><div class="card-title">Principe</div><div class="card-sub" style="margin-top:5px">Le programme d’Aurore ne montre jamais un élément en dehors de ses heures de garde. Pour ajouter un élément hors plage, modifie d’abord l’horaire de ce jour.</div></section></div></div>`;
}
function nannyCalendar(){
  const date=state.selectedDate;
  return `${previewBanner()}<div class="page-head"><div><h1>Mon planning</h1><p>Horaires et programme, sans configuration inutile.</p></div></div>${weekToolbar()}${weekStrip()}<div class="grid"><div class="stack">${scheduleSummaryCard(date,false)}${programCard(date,'NANNY',false)}</div><div class="stack">${weeklyScheduleCard(false)}</div></div>`;
}

function historyDates(){
  return Object.values(state.days).filter(d=>d.careSession?.status==='ENDED').map(d=>d.date).sort().reverse();
}
function historyList(){
  const dates=historyDates();
  return `<div class="history-list">${dates.length?dates.map(date=>{const d=dayRecord(state,date), purchases=purchasesForDate(date), exceptions=d.events.filter(e=>['MEAL_ADJUSTMENT','TASK_EXCEPTION','INCIDENT','NOTE'].includes(e.type)).length;return `<button class="history-item" data-action="open-history-date" data-date="${date}"><div><strong>${fmtDate(date,{weekday:'long',day:'numeric',month:'long'})}</strong><span>${d.careSession?`${fmtTime(d.careSession.startedAt)} → ${fmtTime(d.careSession.endedAt)}`:''} · ${exceptions?`${exceptions} exception${exceptions>1?'s':''}`:'RAS'}${purchases.length?` · ${purchases.length} achat${purchases.length>1?'s':''}`:''}</span></div><span>›</span></button>`}).join(''):`<div class="empty">Aucune journée terminée pour le moment.</div>`}</div>`;
}
function historyDetail(date){
  const d=dayRecord(state,date), purchases=purchasesForDate(date);
  return `<div class="history-detail-head"><button class="back" data-action="history-back">‹</button><div><h2>${fmtDate(date,{weekday:'long',day:'numeric',month:'long'})}</h2><div class="card-sub">Journée en lecture seule</div></div></div><div class="grid"><div class="stack">${scheduleSummaryCard(date,false)}${timelineCard(date)}</div><div class="stack">${programCard(date,'HISTORY',false)}<section class="card"><div class="card-title">Achats du jour</div>${purchases.length?purchases.map(p=>`<div class="purchase-row done"><div class="check"></div><div class="purchase-name"><strong>${esc(p.label)}</strong><span>${fmtMoney(p.amount)}</span></div></div>`).join(''):`<div class="empty">Aucun achat ce jour-là.</div>`}</section></div></div>`;
}
function historyPage(){
  if(state.historyDate) return `<div class="page-head"><div><h1>Historique</h1><p>Les vraies journées enregistrées, sans exemples fictifs.</p></div></div>${historyDetail(state.historyDate)}`;
  return `<div class="page-head"><div><h1>Historique</h1><p>Chaque journée terminée est consultable en détail.</p></div></div><div class="grid"><div>${historyList()}</div><section class="card"><div class="card-title">RAS = tout va bien</div><div class="card-sub" style="margin-top:6px;line-height:1.5">Une journée sans exception n’est pas vide : elle s’est simplement déroulée comme prévu.</div></section></div>`;
}

function familyPage(){
  if(viewingNanny()){
    return `${previewBanner()}<div class="page-head"><div><h1>${isNanny()?'Mon profil':'Profil Aurore'}</h1><p>La future V3 donnera à Aurore son propre accès et ses propres droits.</p></div></div><div class="grid"><section class="card"><div class="person-row"><div class="avatar">A</div><div class="person-copy"><strong>Aurore</strong><span>Nounou · accès opérationnel</span></div><span class="pill green">Nounou</span></div><div class="person-row"><div class="avatar">C</div><div class="person-copy"><strong>Constance</strong><span>5 ans · enfant gardé</span></div><span class="pill amber">Enfant</span></div></section><section class="card"><div class="card-title">Préparation V3</div><div class="card-sub" style="margin:6px 0 14px;line-height:1.5">La V2 sépare déjà le rôle connecté de la vue affichée. En V3, l’authentification serveur remplacera simplement le mode démo.</div>${isNanny()?`<button class="btn btn-soft full" data-action="simulate-parent">Revenir à la session Parent (démo)</button>`:''}</section></div>`;
  }
  return `<div class="page-head"><div><h1>Famille</h1><p>Utilisateurs, accès et configuration du foyer.</p></div></div><div class="grid"><section class="card"><div class="card-title-row"><div><div class="card-title">Famille Youpiii</div><div class="card-sub">Préparation des accès V3</div></div><span class="pill blue">V2 démo</span></div><div class="person-row"><div class="avatar">P</div><div class="person-copy"><strong>Parent</strong><span>Prépare le planning, les menus et la caisse</span></div><span class="pill">Parent</span></div><div class="person-row"><div class="avatar">A</div><div class="person-copy"><strong>Aurore</strong><span>Voit uniquement son planning et agit pendant la garde</span></div><span class="pill green">Nounou</span></div><div class="person-row"><div class="avatar">C</div><div class="person-copy"><strong>Constance</strong><span>5 ans</span></div><span class="pill amber">Enfant</span></div></section><div class="stack"><section class="card"><div class="card-title">Tester les accès V3</div><div class="card-sub" style="margin:6px 0 14px;line-height:1.5">En tant que Parent, “Vue Aurore” est une prévisualisation en lecture seule. Pour tester les actions réelles d’Aurore dans cette V2, ouvre une session Aurore de démonstration.</div><button class="btn btn-green full" data-action="simulate-nanny">Simuler la connexion Aurore</button></section><section class="card"><div class="card-title">Démonstration</div><div class="card-sub" style="margin:6px 0 14px">Réinitialise la V2 avec une caisse de 100 € et plusieurs vraies journées.</div><button class="btn btn-danger full" data-action="reset-demo">Réinitialiser la V2</button></section></div></div>`;
}

function render(){
  let page;
  if(state.activeTab==='today') page=viewingParent()?parentToday():nannyToday();
  else if(state.activeTab==='calendar') page=viewingParent()?parentCalendar():nannyCalendar();
  else if(state.activeTab==='history') page=historyPage();
  else page=familyPage();
  app.innerHTML=`<div class="app-shell">${header()}<main>${page}</main>${bottomNav()}${viewingNanny()&&nannyCanAct()&&state.activeTab==='today'?`<button class="fab" data-action="open-add" aria-label="Ajouter">＋</button>`:''}</div>`;
}

function briefingSheet(){
  const date=today(), s=getScheduleForDate(state,date), d=dayRecord(state,date), plans=visiblePlansForDate(state,date);
  openSheet(`${sheetHead('Briefing du jour',s.enabled?`${s.start} → ${s.end} · Constance`:'Pas de garde aujourd’hui')}<div class="info-list">${d.instructions?.length?d.instructions.map(i=>`<div class="info-row"><div class="info-emoji">${i.icon||'ℹ️'}</div><div class="info-text">${esc(i.text)}</div></div>`).join(''):`<div class="info-row"><div class="info-emoji">✓</div><div class="info-text">Aucune consigne particulière.</div></div>`}</div><div class="sheet-section"><div class="card-title">Programme</div><div class="program-list" style="margin-top:8px">${plans.map(p=>`<div class="program-row"><div class="program-time">${p.time}</div><div class="program-copy"><strong>${p.kind==='MEAL'?'🍽':'✓'} ${esc(p.label)}</strong><span>${esc(p.detail||'')}</span></div></div>`).join('')}</div></div>`);
}
function addMenuSheet(){
  const nap=currentNap(), outing=activeOuting();
  openSheet(`${sheetHead('Ajouter','Seulement ce qui mérite d’être transmis')}<div class="action-grid">${nap?`<button class="action-tile" data-action="end-nap"><span class="emoji">☀️</span><strong>Réveil</strong><span>Terminer la sieste</span></button>`:`<button class="action-tile" data-action="start-nap"><span class="emoji">😴</span><strong>Sieste</strong><span>Démarrer maintenant</span></button>`}${outing?`<button class="action-tile" data-action="end-outing"><span class="emoji">🏠</span><strong>Retour</strong><span>Terminer la sortie</span></button>`:`<button class="action-tile" data-action="outing"><span class="emoji">🌳</span><strong>Sortie</strong><span>Parc, bibliothèque…</span></button>`}<button class="action-tile" data-action="note"><span class="emoji">ℹ️</span><strong>À savoir</strong><span>Information utile</span></button><button class="action-tile" data-action="moment"><span class="emoji">✨</span><strong>Bon moment</strong><span>Petit souvenir sans photo</span></button><button class="action-tile" data-action="incident"><span class="emoji">⚠️</span><strong>Incident</strong><span>Un fait important</span></button><button class="action-tile" data-action="shopping-add"><span class="emoji">🛒</span><strong>À acheter</strong><span>Quelque chose manque</span></button><button class="action-tile" data-action="unplanned-purchase"><span class="emoji">💶</span><strong>Achat imprévu</strong><span>Acheté directement</span></button></div>`);
}
function genericTextSheet(type,title,placeholder){
  openSheet(`${sheetHead(title,'Aucune validation inutile')}<form class="form" id="text-event-form" data-type="${type}"><div class="field"><label for="event-text">Détail</label><textarea id="event-text" name="text" placeholder="${esc(placeholder)}" required></textarea></div><button class="btn btn-brand full" type="submit">Enregistrer</button></form>`);
}
function outingSheet(){
  openSheet(`${sheetHead('Nouvelle sortie','GPS ponctuel uniquement')}<form class="form" id="outing-form"><div class="field"><label for="outing-place">Lieu</label><input id="outing-place" name="place" placeholder="Parc Montsouris" required></div><label class="checkline"><input type="checkbox" name="gps"><div><strong>Partager ma position maintenant</strong><span>Jamais de suivi permanent.</span></div></label><button class="btn btn-brand full" type="submit">Démarrer la sortie</button></form>`);
}
function shoppingAddSheet(prefill='',reason='',source='PARENT'){
  openSheet(`${sheetHead('Ajouter à acheter','Aurore indiquera le prix au moment de l’achat')}<form class="form" id="shopping-form" data-source="${source}"><div class="field"><label for="shop-name">Produit</label><input id="shop-name" name="name" value="${esc(prefill)}" placeholder="Yaourts" required></div><div class="field"><label for="shop-reason">Pourquoi / pour quoi ?</label><input id="shop-reason" name="reason" value="${esc(reason)}" placeholder="Pour le goûter"></div><button class="btn btn-brand full" type="submit">Ajouter</button></form>`);
}
function purchaseSheet(item){
  const w=walletStats();
  openSheet(`${sheetHead(`Acheté · ${item.name}`,'Le montant sera déduit automatiquement de la caisse')}<div class="notice">Caisse disponible avant cet achat : <strong>${fmtMoney(w.available)}</strong>${w.due?` · déjà ${fmtMoney(w.due)} à rembourser à Aurore`:''}</div><form class="form" id="purchase-form" data-item="${item.id}"><div class="field"><label for="purchase-amount">Montant payé</label><input id="purchase-amount" name="amount" type="number" min="0.01" step="0.01" placeholder="5,80" required></div><div class="field"><label for="purchase-note">Précision facultative</label><input id="purchase-note" name="note" placeholder="Monoprix"></div><button class="btn btn-brand full" type="submit">Enregistrer l’achat</button></form>`);
}
function unplannedPurchaseSheet(){
  openSheet(`${sheetHead('Achat imprévu','Pas besoin de créer une course avant')}<form class="form" id="unplanned-purchase-form"><div class="field"><label for="up-name">Achat</label><input id="up-name" name="name" placeholder="Crème solaire" required></div><div class="field"><label for="up-amount">Montant</label><input id="up-amount" name="amount" type="number" min="0.01" step="0.01" placeholder="12,50" required></div><button class="btn btn-brand full" type="submit">Enregistrer</button></form>`);
}
function cashTopupSheet(){
  const w=walletStats();
  openSheet(`${sheetHead('Ajouter à la caisse','Le remboursement éventuel d’Aurore est absorbé automatiquement')}<div class="notice">Actuellement : ${fmtMoney(w.available)} disponibles · ${fmtMoney(w.due)} à rembourser à Aurore.</div><form class="form" id="cash-topup-form"><div class="field"><label for="cash-amount">Montant donné à Aurore</label><input id="cash-amount" name="amount" type="number" min="0.01" step="0.01" placeholder="50" required></div><button class="btn btn-brand full" type="submit">Ajouter à la caisse</button></form>`);
}
function weeklyScheduleSheet(){
  const names={'1':'Lundi','2':'Mardi','3':'Mercredi','4':'Jeudi','5':'Vendredi','6':'Samedi','0':'Dimanche'}, order=['1','2','3','4','5','6','0'];
  openSheet(`${sheetHead('Configurer la semaine type','Horaires habituels d’Aurore')}<form class="form" id="weekly-schedule-form">${order.map(k=>{const x=state.weeklySchedule[k];return `<div class="sheet-section"><label class="checkline"><input type="checkbox" name="enabled-${k}" ${x.enabled?'checked':''}><div><strong>${names[k]}</strong><span>Jour travaillé</span></div></label><div class="form-row"><div class="field"><label for="start-${k}">Début</label><input id="start-${k}" type="time" name="start-${k}" value="${x.start}"></div><div class="field"><label for="end-${k}">Fin</label><input id="end-${k}" type="time" name="end-${k}" value="${x.end}"></div></div></div>`}).join('')}<button class="btn btn-brand full" type="submit">Enregistrer la semaine type</button></form>`);
}
function dayScheduleSheet(date){
  const s=getScheduleForDate(state,date), ex=state.scheduleExceptions[date];
  const mode=ex?.kind==='OFF'?'OFF':ex?.kind==='CUSTOM'?'CUSTOM':'DEFAULT';
  openSheet(`${sheetHead(`Horaire · ${fmtDate(date,{weekday:'long',day:'numeric',month:'long'})}`,'Cette modification ne casse pas la semaine type')}<form class="form" id="day-schedule-form" data-date="${date}"><div class="field"><label for="schedule-mode">Pour ce jour</label><select id="schedule-mode" name="mode"><option value="DEFAULT" ${mode==='DEFAULT'?'selected':''}>Utiliser la semaine type</option><option value="CUSTOM" ${mode==='CUSTOM'?'selected':''}>Horaire exceptionnel</option><option value="OFF" ${mode==='OFF'?'selected':''}>Pas de garde</option></select></div><div class="form-row"><div class="field"><label for="custom-start">Début exceptionnel</label><input id="custom-start" type="time" name="start" value="${ex?.start||s.start||'16:00'}"></div><div class="field"><label for="custom-end">Fin exceptionnelle</label><input id="custom-end" type="time" name="end" value="${ex?.end||s.end||'18:30'}"></div></div><button class="btn btn-brand full" type="submit">Enregistrer ce jour</button></form>`);
}
function planSheet(date,id=null){
  const s=getScheduleForDate(state,date), d=ensureDay(state,date), p=id?d.plans.find(x=>x.id===id):null;
  if(!s.enabled){toast('Ajoute d’abord un horaire de garde pour ce jour');return;}
  openSheet(`${sheetHead(p?'Modifier le programme':'Ajouter au programme',`${s.start} → ${s.end} · uniquement pendant la garde`)}<form class="form" id="plan-form" data-date="${date}" data-id="${p?.id||''}"><div class="field"><label for="plan-kind">Type</label><select id="plan-kind" name="kind"><option value="MEAL" ${p?.kind==='MEAL'?'selected':''}>Repas</option><option value="TASK" ${p?.kind==='TASK'?'selected':''}>Tâche</option></select></div><div class="field"><label for="plan-time">Heure</label><input id="plan-time" type="time" name="time" min="${s.start}" max="${s.end}" value="${p?.time||s.start}" required></div><div class="field"><label for="plan-label">Nom</label><input id="plan-label" name="label" value="${esc(p?.label||'')}" placeholder="Goûter, bain…" required></div><div class="field"><label for="plan-detail">Menu / détail</label><input id="plan-detail" name="detail" value="${esc(p?.detail||'')}" placeholder="Yaourt + compote"></div><div class="field"><label for="plan-prep">Pour un repas</label><select id="plan-prep" name="preparation"><option value="GIVE" ${p?.preparation==='GIVE'?'selected':''}>À donner</option><option value="PREPARED" ${p?.preparation==='PREPARED'?'selected':''}>Déjà préparé</option><option value="NANNY_PREP" ${p?.preparation==='NANNY_PREP'?'selected':''}>À préparer par Aurore</option></select></div><button class="btn btn-brand full" type="submit">${p?'Enregistrer':'Ajouter au programme'}</button>${p?`<button class="btn btn-danger full" type="button" data-action="delete-plan" data-date="${date}" data-id="${p.id}">Supprimer</button>`:''}</form>`);
}
function adjustMealSheet(date,id){
  const p=dayRecord(state,date).plans.find(x=>x.id===id); if(!p)return;
  openSheet(`${sheetHead(`Adapter · ${p.label}`,`${p.time} · prévu : ${p.detail}`)}<div class="action-grid"><button class="action-tile" data-action="meal-replace" data-date="${date}" data-id="${id}"><span class="emoji">🍌</span><strong>Remplacer</strong><span>Ex. banane à la place du yaourt</span></button><button class="action-tile" data-action="meal-to-shopping" data-date="${date}" data-id="${id}"><span class="emoji">🛒</span><strong>À acheter</strong><span>Ajouter l’aliment manquant</span></button><button class="action-tile" data-action="meal-impossible" data-date="${date}" data-id="${id}"><span class="emoji">⚠️</span><strong>Impossible</strong><span>Informer les parents</span></button></div>`);
}
function mealReplaceSheet(date,id){
  const p=dayRecord(state,date).plans.find(x=>x.id===id);
  openSheet(`${sheetHead('Remplacer un aliment',`Prévu : ${p.detail}`)}<form class="form" id="meal-replace-form" data-date="${date}" data-id="${id}"><div class="field"><label for="missing">Aliment manquant</label><input id="missing" name="missing" placeholder="Yaourt" required></div><div class="field"><label for="replacement">Remplacé par</label><input id="replacement" name="replacement" placeholder="Banane" required></div><label class="checkline"><input type="checkbox" name="shopping" checked><div><strong>Ajouter l’aliment manquant à acheter</strong><span>Aurore indiquera le prix quand elle l’achètera.</span></div></label><button class="btn btn-brand full" type="submit">Enregistrer l’adaptation</button></form>`);
}
function taskExceptionSheet(date,id){
  const p=dayRecord(state,date).plans.find(x=>x.id===id);
  openSheet(`${sheetHead('Signaler un problème',p.label)}<form class="form" id="task-exception-form" data-date="${date}" data-id="${id}"><div class="field"><label for="task-text">Pourquoi ?</label><textarea id="task-text" name="text" placeholder="Bain non fait : Constance était très fatiguée." required></textarea></div><button class="btn btn-brand full" type="submit">Informer les parents</button></form>`);
}
function endCareSheet(){
  const d=dayRecord(state,today()), exceptions=d.events.filter(e=>['MEAL_ADJUSTMENT','TASK_EXCEPTION','INCIDENT','NOTE','MOMENT','PURCHASE'].includes(e.type));
  openSheet(`${sheetHead('Passation','Tout ce qui n’est pas signalé est considéré comme OK')}<div class="notice">✓ La journée est résumée par écarts, pas par checklist.</div><div class="sheet-section"><div class="info-list">${exceptions.length?exceptions.map(e=>{const m=eventMeta(e);return `<div class="info-row"><div class="info-emoji">${m[0]}</div><div class="info-text"><strong>${esc(m[1])}</strong><br>${esc(m[2])}</div></div>`}).join(''):`<div class="info-row"><div class="info-emoji">✨</div><div class="info-text">Aucune exception. Tout s’est passé comme prévu.</div></div>`}</div></div><button class="btn btn-primary full" data-action="confirm-end-care">Terminer et transmettre</button>`);
}

async function startOuting(place,gps){
  const d=ensureDay(state,today()); let location=null;
  if(gps && navigator.geolocation){
    try{location=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:Math.round(p.coords.accuracy)}),reject,{timeout:5000,maximumAge:60000}));}catch{toast('Position indisponible : sortie enregistrée sans GPS');}
  }
  d.events.push({id:uid('evt'),type:'OUTING_START',at:new Date().toISOString(),place,location}); closeSheet(); commit('Sortie démarrée');
}
function registerPurchase(item, amount, note=''){
  const at=new Date().toISOString(), date=today(), d=ensureDay(state,date);
  item.status='DONE'; item.purchasedAt=at;
  const purchase={id:uid('purchase'),itemId:item.id,label:item.name,amount:Number(amount),note,date,at};
  state.purchases.push(purchase);
  state.walletTransactions.push({id:uid('cash'),type:'PURCHASE',amount:Number(amount),at,label:item.name,purchaseId:purchase.id});
  d.events.push({id:uid('evt'),type:'PURCHASE',at,label:item.name,amount:Number(amount)});
}

function doAction(el){
  const a=el.dataset.action, id=el.dataset.id, date=el.dataset.date;
  if(a==='close-sheet'){closeSheet();return}
  if(a==='open-add'){if(nannyCanAct())addMenuSheet();return}
  if(a==='briefing'){briefingSheet();return}
  if(a==='start-care'){
    if(!nannyCanAct())return; const s=getScheduleForDate(state,today()); if(!s.enabled){toast('Pas de garde prévue aujourd’hui');return;}
    const d=ensureDay(state,today()), at=new Date().toISOString(); d.careSession={status:'ACTIVE',startedAt:at,plannedStart:s.start,plannedEnd:s.end}; d.events.push({id:uid('evt'),type:'CARE_START',at}); commit('Garde commencée');return;
  }
  if(a==='end-care'){if(nannyCanAct())endCareSheet();return}
  if(a==='confirm-end-care'){
    if(!nannyCanAct())return; const d=ensureDay(state,today()), at=new Date().toISOString(); d.careSession={...(d.careSession||{}),status:'ENDED',endedAt:at};d.events.push({id:uid('evt'),type:'CARE_END',at});closeSheet();commit('Passation enregistrée');return;
  }
  if(a==='start-nap'){const d=ensureDay(state,today());d.events.push({id:uid('evt'),type:'NAP_START',at:new Date().toISOString()});closeSheet();commit('Sieste démarrée');return}
  if(a==='end-nap'){const d=ensureDay(state,today()),n=currentNap();if(n){const at=new Date().toISOString();const mins=Math.round((new Date(at)-new Date(n.at))/60000);d.events.push({id:uid('evt'),type:'NAP_END',at,text:`${Math.floor(mins/60)}h${String(mins%60).padStart(2,'0')}`});closeSheet();commit('Réveil enregistré')}return}
  if(a==='outing'){outingSheet();return}
  if(a==='end-outing'){const d=ensureDay(state,today());d.events.push({id:uid('evt'),type:'OUTING_END',at:new Date().toISOString()});commit('Retour enregistré');return}
  if(a==='note'){genericTextSheet('NOTE','À savoir','Il n’y a presque plus de compotes.');return}
  if(a==='moment'){genericTextSheet('MOMENT','Bon moment','Constance était très fière de son dessin.');return}
  if(a==='incident'){genericTextSheet('INCIDENT','Incident','Constance est tombée au parc, petite égratignure.');return}
  if(a==='shopping-add'){shoppingAddSheet();return}
  if(a==='buy-shopping'){const item=state.shopping.find(x=>x.id===id);if(item)purchaseSheet(item);return}
  if(a==='unplanned-purchase'){unplannedPurchaseSheet();return}
  if(a==='cash-topup'){cashTopupSheet();return}
  if(a==='edit-weekly-schedule'){weeklyScheduleSheet();return}
  if(a==='edit-day-schedule'){dayScheduleSheet(date);return}
  if(a==='add-plan'){planSheet(date);return}
  if(a==='edit-plan'){planSheet(date,id);return}
  if(a==='delete-plan'){const d=ensureDay(state,date);d.plans=d.plans.filter(p=>p.id!==id);closeSheet();commit('Élément supprimé');return}
  if(a==='adjust-meal'){adjustMealSheet(date,id);return}
  if(a==='meal-replace'){mealReplaceSheet(date,id);return}
  if(a==='meal-to-shopping'){
    const p=dayRecord(state,date).plans.find(x=>x.id===id); closeSheet(); shoppingAddSheet('',`Pour ${p?.label||'le repas'}`,'MEAL');return;
  }
  if(a==='meal-impossible'){
    const p=dayRecord(state,date).plans.find(x=>x.id===id),d=ensureDay(state,date);d.events.push({id:uid('evt'),type:'MEAL_ADJUSTMENT',at:new Date().toISOString(),label:p?.label,text:`Repas prévu impossible : ${p?.detail||''}`});closeSheet();commit('Parents informés');return;
  }
  if(a==='task-exception'){taskExceptionSheet(date,id);return}
  if(a==='week-prev'){state.calendarAnchor=addDays(state.calendarAnchor,-7);state.selectedDate=state.calendarAnchor;commit();return}
  if(a==='week-next'){state.calendarAnchor=addDays(state.calendarAnchor,7);state.selectedDate=state.calendarAnchor;commit();return}
  if(a==='calendar-today'){state.calendarAnchor=mondayOf(today());state.selectedDate=today();commit();return}
  if(a==='open-calendar-date'){state.selectedDate=date;state.calendarAnchor=mondayOf(date);state.activeTab='calendar';commit();return}
  if(a==='open-history-date'){state.historyDate=date;state.activeTab='history';commit();return}
  if(a==='history-back'){state.historyDate=null;commit();return}
  if(a==='simulate-nanny'){state.session={actorRole:'NANNY',viewRole:'NANNY'};state.activeTab='today';commit('Session Aurore activée pour la démo');return}
  if(a==='simulate-parent'){state.session={actorRole:'PARENT',viewRole:'PARENT'};state.activeTab='today';commit('Retour à la session Parent');return}
  if(a==='reset-demo'){state=resetState();closeSheet();render();toast('V2 réinitialisée');return}
}

document.addEventListener('click',e=>{
  if(e.target instanceof Element && e.target.classList.contains('sheet-backdrop')){closeSheet();return}
  const view=e.target.closest('[data-view]'); if(view){state.session.viewRole=view.dataset.view;state.activeTab='today';state.historyDate=null;commit();return}
  const tab=e.target.closest('[data-tab]'); if(tab){state.activeTab=tab.dataset.tab;state.historyDate=null;commit();return}
  const chip=e.target.closest('.day-chip[data-date]'); if(chip){state.selectedDate=chip.dataset.date;commit();return}
  const action=e.target.closest('[data-action]'); if(action) doAction(action);
});

document.addEventListener('submit',async e=>{
  e.preventDefault(); const f=e.target, fd=new FormData(f);
  if(f.id==='weekly-schedule-form'){
    for(const k of ['1','2','3','4','5','6','0']) state.weeklySchedule[k]={enabled:fd.get(`enabled-${k}`)==='on',start:String(fd.get(`start-${k}`)||'16:00'),end:String(fd.get(`end-${k}`)||'18:30')};
    closeSheet();commit('Semaine type mise à jour');return;
  }
  if(f.id==='day-schedule-form'){
    const date=f.dataset.date, mode=fd.get('mode');
    if(mode==='DEFAULT') delete state.scheduleExceptions[date];
    if(mode==='OFF') state.scheduleExceptions[date]={kind:'OFF'};
    if(mode==='CUSTOM') state.scheduleExceptions[date]={kind:'CUSTOM',start:String(fd.get('start')),end:String(fd.get('end'))};
    closeSheet();commit('Horaire du jour mis à jour');return;
  }
  if(f.id==='plan-form'){
    const date=f.dataset.date, id=f.dataset.id, s=getScheduleForDate(state,date), time=String(fd.get('time'));
    if(!isTimeWithin(time,s)){toast(`L’heure doit rester entre ${s.start} et ${s.end}`);return;}
    const d=ensureDay(state,date), payload={kind:String(fd.get('kind')),time,label:String(fd.get('label')).trim(),detail:String(fd.get('detail')).trim(),preparation:String(fd.get('preparation'))};
    if(id){const p=d.plans.find(x=>x.id===id);Object.assign(p,payload)}else d.plans.push({id:uid('plan'),...payload});
    closeSheet();commit('Programme mis à jour');return;
  }
  if(f.id==='shopping-form'){
    state.shopping.push({id:uid('shop'),name:String(fd.get('name')).trim(),reason:String(fd.get('reason')||'').trim(),status:'TODO',source:f.dataset.source||state.session.actorRole,createdAt:new Date().toISOString()});closeSheet();commit('Ajouté à acheter');return;
  }
  if(f.id==='purchase-form'){
    const item=state.shopping.find(x=>x.id===f.dataset.item);if(item)registerPurchase(item,Number(fd.get('amount')),String(fd.get('note')||''));closeSheet();const w=walletStats();commit(w.due?`Achat enregistré · ${fmtMoney(w.due)} à rembourser à Aurore`:'Achat enregistré');return;
  }
  if(f.id==='unplanned-purchase-form'){
    const item={id:uid('shop'),name:String(fd.get('name')).trim(),reason:'Achat imprévu',status:'TODO',source:'NANNY',createdAt:new Date().toISOString()};state.shopping.push(item);registerPurchase(item,Number(fd.get('amount')),'');closeSheet();const w=walletStats();commit(w.due?`Achat enregistré · ${fmtMoney(w.due)} à rembourser à Aurore`:'Achat enregistré');return;
  }
  if(f.id==='cash-topup-form'){
    const amount=Number(fd.get('amount'));state.walletTransactions.push({id:uid('cash'),type:'TOPUP',amount,at:new Date().toISOString(),label:'Caisse confiée par les parents'});closeSheet();const w=walletStats();commit(w.due?`Caisse ajoutée · reste ${fmtMoney(w.due)} à rembourser`:`Caisse disponible : ${fmtMoney(w.available)}`);return;
  }
  if(f.id==='meal-replace-form'){
    const date=f.dataset.date,id=f.dataset.id,d=ensureDay(state,date),p=d.plans.find(x=>x.id===id),missing=String(fd.get('missing')).trim(),replacement=String(fd.get('replacement')).trim();d.events.push({id:uid('evt'),type:'MEAL_ADJUSTMENT',at:new Date().toISOString(),label:p?.label,text:`${replacement} à la place de ${missing}`});if(fd.get('shopping')==='on')state.shopping.push({id:uid('shop'),name:missing,reason:`Manquant pour ${p?.label||'un repas'}`,status:'TODO',source:'MEAL',createdAt:new Date().toISOString()});closeSheet();commit('Adaptation enregistrée');return;
  }
  if(f.id==='task-exception-form'){
    const date=f.dataset.date,id=f.dataset.id,d=ensureDay(state,date),p=d.plans.find(x=>x.id===id);d.events.push({id:uid('evt'),type:'TASK_EXCEPTION',at:new Date().toISOString(),label:p?.label,text:String(fd.get('text')).trim()});closeSheet();commit('Exception transmise');return;
  }
  if(f.id==='text-event-form'){
    const d=ensureDay(state,today());d.events.push({id:uid('evt'),type:f.dataset.type,at:new Date().toISOString(),text:String(fd.get('text')).trim()});closeSheet();commit('Information enregistrée');return;
  }
  if(f.id==='outing-form'){await startOuting(String(fd.get('place')).trim(),fd.get('gps')==='on');return}
});

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
render();
