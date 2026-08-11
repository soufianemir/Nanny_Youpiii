import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ACTIVITY_PRESETS, MAX_ACTIVITY_PRESETS, activityKeyFromStored, activityStatusFor, activityTypes } from "../lib/activity";

test("la liste par défaut reste volontairement courte",()=>{
  assert.deepEqual([...DEFAULT_ACTIVITY_PRESETS],["Repas","Sieste","Bain / toilette","Sortie"]);
  assert.equal(DEFAULT_ACTIVITY_PRESETS.length,4);
  assert.equal(MAX_ACTIVITY_PRESETS,10);
});

test("les types internes gardent Autre pour la compatibilité",()=>{
  assert.equal(activityTypes.at(-1)?.label,"Autre");
});

test("seule une activité saisie comme Maintenant est réalisée immédiatement",()=>{
  assert.equal(activityStatusFor("NOW"),"DONE");
});

test("une activité programmée reste prévue même quand son heure passe",()=>{
  assert.equal(activityStatusFor("SCHEDULED"),"PLANNED");
});

test("les noms choisis par les parents récupèrent une présentation adaptée quand possible",()=>{
  assert.equal(activityKeyFromStored("","Biberon"),"MEAL");
  assert.equal(activityKeyFromStored("","Couche"),"TOILET");
  assert.equal(activityKeyFromStored("","Devoirs"),"SCHOOL");
  assert.equal(activityKeyFromStored("","Escalade"),"PLAY");
  assert.equal(activityKeyFromStored("","Piano"),"OTHER");
});

test("les anciennes activités restent éditables avec le bon type",()=>{
  assert.equal(activityKeyFromStored("Activité","Repas du soir"),"MEAL");
  assert.equal(activityKeyFromStored("Activité","Bain"),"TOILET");
  assert.equal(activityKeyFromStored("Activité","Piano"),"OTHER");
});
