export function applyPurchase(balance: number, advance: number, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Montant invalide");
  const fromCash = Math.min(Math.max(balance, 0), amount);
  return {
    cashBalance: Math.max(0, balance - amount),
    advanceBalance: advance + Math.max(0, amount - fromCash),
    fromCash,
    advanced: Math.max(0, amount - fromCash),
  };
}

export function applyFunding(balance: number, advance: number, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Montant invalide");
  const reimbursedAdvance = Math.min(advance, amount);
  return {
    cashBalance: balance + (amount - reimbursedAdvance),
    advanceBalance: advance - reimbursedAdvance,
    reimbursedAdvance,
  };
}

export function applyReimbursement(advance: number, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > advance) throw new Error("Montant de remboursement invalide");
  return { advanceBalance: advance - amount };
}
