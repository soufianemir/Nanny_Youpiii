import test from "node:test";
import assert from "node:assert/strict";
import { PRIMARY_NAV, normalizeMoreArea, normalizeSection, quickKinds, visiblePrimaryNav } from "../lib/v4-navigation";

test("V5.3 garde quatre destinations principales maximum",()=>{assert.deepEqual(PRIMARY_NAV.map(item=>item.label),["Aujourd’hui","Planning","Courses","Plus"]);assert.equal(PRIMARY_NAV.length,4);});
test("une intervenante sans droit planning ou courses voit seulement les rubriques utiles",()=>{const nav=visiblePrimaryNav({canPlanning:false,canShopping:false});assert.deepEqual(nav.map(item=>item.id),["today","more"]);});
test("le journal devient un historique secondaire et Courses un onglet principal",()=>{assert.equal(normalizeSection("program",true,true),"planning");assert.equal(normalizeSection("shopping",true,true),"shopping");assert.equal(normalizeSection("journal",true,true),"more");assert.equal(normalizeMoreArea("journal",undefined),"history");assert.equal(normalizeMoreArea("config",undefined),"home");});
test("les actions rapides fusionnent activité et tâche en une seule entrée planning",()=>{assert.deepEqual(quickKinds({parent:true,canProgram:true,canTasks:true,canJournal:true,canShopping:true,canAdmin:true}),["activity","instruction","shopping","shift"]);assert.deepEqual(quickKinds({parent:true,canProgram:false,canTasks:true,canJournal:false,canShopping:false,canAdmin:false}),["activity"]);assert.deepEqual(quickKinds({parent:false,canProgram:true,canTasks:true,canJournal:true,canShopping:true,canAdmin:false}),["shopping"]);});
