import test from "node:test";
import assert from "node:assert/strict";
import { applyFunding, applyPurchase, applyReimbursement } from "../lib/cash";

test("100 € de caisse et achat 105 € donne 0 € de caisse et 5 € d’avance", () => {
  assert.deepEqual(applyPurchase(100,0,105), { cashBalance:0, advanceBalance:5, fromCash:100, advanced:5 });
});

test("rechargement 50 € avec 5 € d’avance rembourse d’abord l’avance", () => {
  assert.deepEqual(applyFunding(0,5,50), { cashBalance:45, advanceBalance:0, reimbursedAdvance:5 });
});

test("les avances sont isolées par intervenant au niveau appelant", () => {
  const aurore=applyPurchase(0,0,12);
  const sophie=applyPurchase(20,0,5);
  assert.equal(aurore.advanceBalance,12);
  assert.equal(sophie.advanceBalance,0);
});

test("un remboursement ne peut pas dépasser l’avance", () => {
  assert.throws(()=>applyReimbursement(5,6));
  assert.equal(applyReimbursement(5,5).advanceBalance,0);
});
