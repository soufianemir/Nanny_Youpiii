import test from "node:test";
import assert from "node:assert/strict";
import { journalKindFromParam } from "../lib/v4-journal";

// Final V4 polish regression coverage.
test("les raccourcis Journal ne retombent pas tous sur Repas",()=>{
  assert.equal(journalKindFromParam("MEAL"),"MEAL");
  assert.equal(journalKindFromParam("NAP"),"NAP");
  assert.equal(journalKindFromParam("MOOD"),"MOOD");
  assert.equal(journalKindFromParam("NOTE"),"NOTE");
  assert.equal(journalKindFromParam("INVALID"),"NOTE");
});
