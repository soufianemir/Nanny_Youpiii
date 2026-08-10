import test from "node:test";
import assert from "node:assert/strict";
import { carePeriodNote, datesInPeriod, parseCarePeriodNote, schoolYearPeriod, weekdayFromIso } from "../lib/care-schedule";

test("le preset d'août prépare l'année scolaire suivante",()=>{
  assert.deepEqual(schoolYearPeriod("2026-08-10"),{start:"2026-09-01",end:"2027-07-31"});
});

test("la période conserve ses bornes dans le marqueur de garde",()=>{
  const note=carePeriodNote("2026-09-01","2027-07-31");
  assert.deepEqual(parseCarePeriodNote(note),{start:"2026-09-01",end:"2027-07-31"});
});

test("le générateur de période inclut les deux bornes",()=>{
  assert.deepEqual(datesInPeriod("2026-08-10","2026-08-12"),["2026-08-10","2026-08-11","2026-08-12"]);
});

test("le 10 août 2026 est un lundi",()=>{
  assert.equal(weekdayFromIso("2026-08-10"),1);
});
