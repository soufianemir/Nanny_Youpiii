const STORAGE_KEY = 'nanny-youpiii-state-v2';

export const isoDate = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const parseDate = (value) => {
  const [y,m,d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
};

export const addDays = (value, amount) => {
  const d = typeof value === 'string' ? parseDate(value) : new Date(value);
  d.setDate(d.getDate() + amount);
  return isoDate(d);
};

export const mondayOf = (value = isoDate()) => {
  const d = parseDate(value);
  const delta = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - delta);
  return isoDate(d);
};

export const weekdayKey = (date) => String(parseDate(date).getDay());

export function getScheduleForDate(state, date) {
  const exception = state.scheduleExceptions?.[date];
  if (exception?.kind === 'OFF') return { enabled: false, source: 'exception', label: 'Pas de garde' };
  if (exception?.kind === 'CUSTOM') return { enabled: true, start: exception.start, end: exception.end, source: 'exception', label: 'Horaire exceptionnel' };
  const regular = state.weeklySchedule?.[weekdayKey(date)];
  if (!regular?.enabled) return { enabled: false, source: 'weekly', label: 'Pas de garde' };
  return { enabled: true, start: regular.start, end: regular.end, source: 'weekly', label: 'Semaine type' };
}

export function isTimeWithin(time, schedule) {
  return !!schedule?.enabled && !!time && time >= schedule.start && time <= schedule.end;
}

export function ensureDay(state, date) {
  if (!state.days[date]) state.days[date] = { date, plans: [], instructions: [], events: [], careSession: null };
  return state.days[date];
}

export function dayRecord(state, date) {
  return state.days[date] || { date, plans: [], instructions: [], events: [], careSession: null };
}

export function visiblePlansForDate(state, date) {
  const schedule = getScheduleForDate(state, date);
  if (!schedule.enabled) return [];
  return dayRecord(state, date).plans
    .filter(p => isTimeWithin(p.time, schedule))
    .sort((a,b) => a.time.localeCompare(b.time));
}

function dateAtTime(date, time) {
  const d = parseDate(date);
  const [h,m] = time.split(':').map(Number);
  d.setHours(h,m,0,0);
  return d.toISOString();
}

function uid(prefix) { return `${prefix}-${Math.random().toString(36).slice(2,10)}`; }

function findWorkingDate(weeklySchedule, fromDate, direction) {
  let cursor = fromDate;
  for (let i=0;i<21;i++) {
    cursor = addDays(cursor, direction);
    const entry = weeklySchedule[weekdayKey(cursor)];
    if (entry?.enabled) return cursor;
  }
  return addDays(fromDate, direction);
}

function basePlans(date, schedule, variant = 0) {
  if (!schedule.enabled) return [];
  const plans = [];
  const snackTime = schedule.start <= '16:30' && schedule.end >= '16:30' ? '16:30' : schedule.start;
  plans.push({ id: uid('plan'), kind: 'MEAL', time: snackTime, label: 'Goûter', detail: variant % 2 ? 'Banane + petit suisse' : 'Yaourt + compote', preparation: 'GIVE' });
  if (schedule.start <= '17:30' && schedule.end >= '17:30') plans.push({ id: uid('plan'), kind: 'TASK', time: '17:30', label: 'Bain', detail: '' });
  if (schedule.start <= '17:50' && schedule.end >= '17:50') plans.push({ id: uid('plan'), kind: 'TASK', time: '17:50', label: 'Préparer le sac de piscine', detail: '' });
  if (schedule.start <= '18:00' && schedule.end >= '18:00') plans.push({ id: uid('plan'), kind: 'MEAL', time: '18:00', label: 'Dîner', detail: variant % 2 ? 'Pâtes, courgettes & fromage' : 'Soupe de légumes + fromage', preparation: 'NANNY_PREP' });
  return plans;
}

export function seedState() {
  const today = isoDate();
  const weeklySchedule = {
    '0': { enabled: false, start: '16:00', end: '18:30' },
    '1': { enabled: true,  start: '16:00', end: '18:30' },
    '2': { enabled: true,  start: '16:00', end: '18:30' },
    '3': { enabled: true,  start: '14:00', end: '18:30' },
    '4': { enabled: true,  start: '16:00', end: '18:30' },
    '5': { enabled: true,  start: '16:00', end: '18:30' },
    '6': { enabled: false, start: '16:00', end: '18:30' }
  };

  const state = {
    version: 2,
    session: { actorRole: 'PARENT', viewRole: 'PARENT' },
    activeTab: 'today',
    selectedDate: today,
    calendarAnchor: mondayOf(today),
    historyDate: null,
    household: { id: 'h1', name: 'Famille Youpiii', timezone: 'Europe/Paris' },
    users: {
      parent: { id: 'u-parent', name: 'Parent', role: 'PARENT', initials: 'P' },
      nanny: { id: 'u-aurore', name: 'Aurore', role: 'NANNY', initials: 'A' }
    },
    child: { id: 'c-constance', name: 'Constance', age: 5 },
    weeklySchedule,
    scheduleExceptions: {},
    days: {},
    shopping: [
      { id: uid('shop'), name: 'Compotes', status: 'TODO', createdAt: new Date().toISOString(), source: 'PARENT', reason: 'À avoir pour les goûters' }
    ],
    purchases: [],
    walletTransactions: [
      { id: uid('cash'), type: 'TOPUP', amount: 100, at: new Date().toISOString(), label: 'Caisse confiée à Aurore' }
    ],
    featureFlags: { gps: true, mealExcel: false, photos: false, authV3: false }
  };

  // La V2 publique reste testable même un jour sans garde dans la semaine type.
  // Cette exception est uniquement une donnée de démonstration et peut être supprimée depuis le calendrier.
  if (!weeklySchedule[weekdayKey(today)]?.enabled) {
    state.scheduleExceptions[today] = { kind: 'CUSTOM', start: '14:00', end: '18:30', demo: true };
  }
  const todaySchedule = getScheduleForDate(state,today);
  if (todaySchedule.enabled) {
    state.days[today] = {
      date: today,
      plans: basePlans(today,todaySchedule,0),
      instructions: [
        { id: uid('info'), icon: '🥜', text: 'Pas de cacahuètes' },
        { id: uid('info'), icon: '🎒', text: 'Piscine demain : préparer le sac' }
      ],
      events: [], careSession: null
    };
  }

  const next1 = findWorkingDate(weeklySchedule, today, 1);
  const next2 = findWorkingDate(weeklySchedule, next1, 1);
  const next3 = findWorkingDate(weeklySchedule, next2, 1);
  [next1,next2,next3].forEach((date,i) => {
    const schedule = getScheduleForDate(state,date);
    state.days[date] = {
      date,
      plans: basePlans(date,schedule,i),
      instructions: i === 0 ? [
        { id: uid('info'), icon: '🥜', text: 'Pas de cacahuètes' },
        { id: uid('info'), icon: '🎒', text: 'Piscine demain : préparer le sac' }
      ] : [],
      events: [],
      careSession: null
    };
  });

  const prev1 = findWorkingDate(weeklySchedule, today, -1);
  const prev2 = findWorkingDate(weeklySchedule, prev1, -1);
  [prev1,prev2].forEach((date,i) => {
    const schedule = getScheduleForDate(state,date);
    const plans = basePlans(date,schedule,i+1);
    const startAt = dateAtTime(date, schedule.start);
    const endAt = dateAtTime(date, schedule.end);
    const events = [
      { id: uid('evt'), type: 'CARE_START', at: startAt, text: 'Aurore commence sa garde' },
      ...(i === 0 ? [{ id: uid('evt'), type: 'OUTING', at: dateAtTime(date,'17:00'), text: 'Parc · sortie enregistrée' }] : []),
      { id: uid('evt'), type: 'CARE_END', at: endAt, text: 'Fin de garde' }
    ];
    state.days[date] = {
      date, plans, instructions: [], events,
      careSession: { status: 'ENDED', startedAt: startAt, endedAt: endAt, plannedStart: schedule.start, plannedEnd: schedule.end }
    };
  });

  return state;
}

export function walletSummary(state) {
  const topups = state.walletTransactions.filter(t=>t.type==='TOPUP').reduce((s,t)=>s+Number(t.amount),0);
  const purchases = state.walletTransactions.filter(t=>t.type==='PURCHASE').reduce((s,t)=>s+Number(t.amount),0);
  const net = topups - purchases;
  return { topups, purchases, net, available: Math.max(0,net), due: Math.max(0,-net) };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw);
    if (parsed.version !== 2) return seedState();
    return parsed;
  } catch {
    return seedState();
  }
}

export function saveState(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
export function resetState() { const s = seedState(); saveState(s); return s; }
