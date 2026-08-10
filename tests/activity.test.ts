import test from "node:test";
import assert from "node:assert/strict";
import { activityKeyFromStored, activityStatusFor, activityTypes } from "../lib/activity";

test("les types quotidiens sont compréhensibles et Autre reste disponible",()=>{
  assert.deepEqual(activityTypes.slice(0,4).map(item=>item.label),["Repas","Sieste","Bain / toilette","Coucher"]);
  assert.equal(activityTypes.at(-1)?.label,"Autre");
});

test("seule une activité saisie comme Maintenant est réalisée immédiatement",()=>{
  assert.equal(activityStatusFor("NOW"),"DONE");
});

test("une activité programmée reste prévue même quand son heure passe",()=>{
  assert.equal(activityStatusFor("SCHEDULED"),"PLANNED");
});

test("les anciennes activités restent éditables avec le bon type",()=>{
  assert.equal(activityKeyFromStored("Activité","Repas du soir"),"MEAL");
  assert.equal(activityKeyFromStored("Activité","Bain"),"TOILET");
  assert.equal(activityKeyFromStored("Activité","Piano"),"OTHER");
});
