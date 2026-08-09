import assert from 'node:assert/strict';
import { seedState, isoDate, getScheduleForDate, visiblePlansForDate, walletSummary, addDays } from '../js/state.js';

const state = seedState();
const today = isoDate();
const schedule = getScheduleForDate(state,today);
assert.equal(schedule.enabled,true,'La V2 de démonstration doit être testable aujourd’hui');
assert.equal(schedule.start,'14:00');
assert.equal(schedule.end,'18:30');
assert.ok(visiblePlansForDate(state,today).every(p => p.time >= schedule.start && p.time <= schedule.end),'Aurore ne doit voir aucun élément hors plage de garde');
assert.ok(!visiblePlansForDate(state,today).some(p => p.time === '12:30'),'Le déjeuner 12:30 ne doit pas apparaître pour une garde commençant à 14:00');

state.walletTransactions.push({id:'test-purchase',type:'PURCHASE',amount:105,at:new Date().toISOString(),label:'Test'});
let wallet = walletSummary(state);
assert.equal(wallet.available,0);
assert.equal(wallet.due,5,'Un achat de 105 € avec 100 € de caisse doit créer 5 € à rembourser à Aurore');
state.walletTransactions.push({id:'test-topup',type:'TOPUP',amount:50,at:new Date().toISOString(),label:'Recharge'});
wallet = walletSummary(state);
assert.equal(wallet.available,45,'Après 50 € ajoutés, 5 € remboursent l’avance et 45 € restent disponibles');
assert.equal(wallet.due,0);

let cursor=today, found=false;
for(let i=0;i<10;i++){cursor=addDays(cursor,1); if(getScheduleForDate(state,cursor).enabled){found=true;break;}}
assert.ok(found,'Une prochaine garde doit être trouvable via la semaine type');
console.log('Nanny Youpiii V2 model tests: OK');
