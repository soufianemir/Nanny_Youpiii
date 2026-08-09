const STORAGE_KEY = 'nanny-youpiii-state-v1';

const isoDate = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const atToday = (hour, minute = 0) => {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

export function seedState() {
  const today = isoDate();
  return {
    version: 1,
    role: 'parent',
    activeTab: 'today',
    household: { id: 'h1', name: 'Famille Youpiii', timezone: 'Europe/Paris' },
    users: {
      parent: { id: 'u-parent', name: 'Parent', role: 'PARENT', initials: 'P' },
      nanny: { id: 'u-aurore', name: 'Aurore', role: 'NANNY', initials: 'A' }
    },
    child: { id: 'c-constance', name: 'Constance', age: 5, color: '#ff8767' },
    today,
    schedule: {
      date: today,
      plannedStart: '14:00',
      plannedEnd: '18:30',
      nannyId: 'u-aurore',
      notes: 'Piscine demain : penser à préparer le sac.'
    },
    careSession: null,
    plans: [
      { id: 'meal-lunch', kind: 'meal', time: '12:30', label: 'Déjeuner', menu: 'Poulet, riz & courgettes', preparation: 'PREPARED', childId: 'c-constance' },
      { id: 'meal-snack', kind: 'meal', time: '16:30', label: 'Goûter', menu: 'Yaourt + compote', preparation: 'GIVE', childId: 'c-constance' },
      { id: 'meal-dinner', kind: 'meal', time: '18:00', label: 'Dîner', menu: 'Soupe de légumes + fromage', preparation: 'NANNY_PREP', childId: 'c-constance' },
      { id: 'task-schoolbag', kind: 'task', time: '17:45', label: 'Préparer le sac de piscine', important: true },
      { id: 'task-bath', kind: 'task', time: '17:30', label: 'Bain', important: false }
    ],
    instructions: [
      { id: 'i1', icon: '🥜', text: 'Pas de cacahuètes', pinned: true },
      { id: 'i2', icon: '👵', text: 'Mamie passe vers 18:15', pinned: true },
      { id: 'i3', icon: '🎒', text: 'Piscine demain : préparer le sac', pinned: true }
    ],
    events: [],
    shopping: [
      { id: 'shop1', name: 'Compotes', status: 'TODO', source: 'parent' },
      { id: 'shop2', name: 'Lait', status: 'TODO', source: 'parent' }
    ],
    wallet: { initial: 100, movements: [] },
    reimbursements: [],
    notifications: [],
    history: [],
    featureFlags: { gps: true, mealExcel: false, photos: false }
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw);
    if (parsed.today !== isoDate()) {
      const fresh = seedState();
      fresh.history = parsed.history || [];
      fresh.shopping = parsed.shopping || fresh.shopping;
      fresh.wallet = parsed.wallet || fresh.wallet;
      fresh.reimbursements = parsed.reimbursements || [];
      return fresh;
    }
    return parsed;
  } catch {
    return seedState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  const state = seedState();
  saveState(state);
  return state;
}

export function nowIso() { return new Date().toISOString(); }
export { atToday, isoDate };