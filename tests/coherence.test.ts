import test from "node:test";
import assert from "node:assert/strict";
import { allChildrenAllowed, canSeeCashFromPermissions, EXCEPTION_SHIFT_NOTE, isTimeWithinWindow, sectionDate } from "../lib/coherence";

test("co-garde: un objet multi-enfants n'est visible que si tous les enfants sont autorisés",()=>{
  assert.equal(allChildrenAllowed(["constance"],["constance","louise"]),false);
  assert.equal(allChildrenAllowed(["constance","louise"],["constance","louise"]),true);
  assert.equal(allChildrenAllowed(["constance"],[]),true);
});

test("Aujourd'hui et Courses reviennent toujours à la date courante",()=>{
  assert.equal(sectionDate("today","2026-08-15","2026-08-10"),"2026-08-10");
  assert.equal(sectionDate("shopping","2026-08-15","2026-08-10"),"2026-08-10");
  assert.equal(sectionDate("planning","2026-08-15","2026-08-10"),"2026-08-15");
});

test("une activité doit tenir entièrement dans la plage de garde",()=>{
  assert.equal(isTimeWithinWindow("14:00","17:00","14:00","18:00"),true);
  assert.equal(isTimeWithinWindow("12:30","13:00","14:00","18:00"),false);
  assert.equal(isTimeWithinWindow("17:30","18:30","14:00","18:00"),false);
});

test("autorisation courses implique visibilité minimale de la caisse",()=>{
  assert.equal(canSeeCashFromPermissions(true,false),true);
  assert.equal(canSeeCashFromPermissions(false,true),true);
  assert.equal(canSeeCashFromPermissions(false,false),false);
});

test("les gardes ponctuelles ont un marqueur distinct de la semaine type",()=>{
  assert.equal(EXCEPTION_SHIFT_NOTE,"__NANNY_EXCEPTION__");
});
