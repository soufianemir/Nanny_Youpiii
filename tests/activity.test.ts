import test from "node:test";
import assert from "node:assert/strict";
import { activityKeyFromStored, activityStatusFor, activityTypes } from "../lib/activity";

test("les types quotidiens sont compréhensibles et Autre reste disponible",()=>{
  assert.deepEqual(activityTypes.slice(0,4).map(item=>item.label),["Repas","Sieste","Bain / toilette","Coucher"]);
  assert.equal(activityTypes.at(-1)?.label,"Autre");
});

test("une activité passée alimente le journal automatiquement",()=>{
  assert.equal(activityStatusFor("2026-08-09","18:00","2026-08-10","19:30"),"DONE");
  assert.equal(activityStatusFor("2026-08-10","18:00","2026-08-10","19:30"),"DONE");
});

test("une activité future reste dans le planning",()=>{
  assert.equal(activityStatusFor("2026-08-10","20:00","2026-08-10","19:30"),"PLANNED");
  assert.equal(activityStatusFor("2026-08-11","09:00","2026-08-10","19:30"),"PLANNED");
});

test("les anciennes activités restent éditables avec le bon type",()=>{
  assert.equal(activityKeyFromStored("Activité","Repas du soir"),"MEAL");
  assert.equal(activityKeyFromStored("Activité","Bain"),"TOILET");
  assert.equal(activityKeyFromStored("Activité","Piano"),"OTHER");
});
