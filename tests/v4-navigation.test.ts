import test from "node:test";
import assert from "node:assert/strict";
import { PRIMARY_NAV, normalizeMoreArea, normalizeSection, quickKinds, visiblePrimaryNav } from "../lib/v4-navigation";

test("V4 garde quatre destinations principales maximum",()=>{
  assert.deepEqual(PRIMARY_NAV.map(item=>item.label),["Aujourd’hui","Planning","Journal","Plus"]);
  assert.equal(PRIMARY_NAV.length,4);
});

test("une intervenante sans droit planning ou journal ne voit pas ces destinations",()=>{
  const nav=visiblePrimaryNav({canPlanning:false,canJournal:false});
  assert.deepEqual(nav.map(item=>item.id),["today","more"]);
});

test("les anciennes sections sont absorbées par la nouvelle architecture",()=>{
  assert.equal(normalizeSection("program",true,true),"planning");
  assert.equal(normalizeSection("shopping",true,true),"more");
  assert.equal(normalizeSection("config",true,true),"more");
  assert.equal(normalizeMoreArea("shopping",undefined),"shopping");
  assert.equal(normalizeMoreArea("config",undefined),"home");
});

test("les actions rapides respectent le rôle et les permissions",()=>{
  assert.deepEqual(quickKinds({parent:true,canProgram:true,canTasks:true,canJournal:true,canShopping:true,canAdmin:true}),["activity","task","instruction","shopping","shift"]);
  assert.deepEqual(quickKinds({parent:false,canProgram:true,canTasks:true,canJournal:true,canShopping:true,canAdmin:false}),["shopping"]);
  assert.deepEqual(quickKinds({parent:false,canProgram:true,canTasks:true,canJournal:true,canShopping:false,canAdmin:false}),[]);
});
