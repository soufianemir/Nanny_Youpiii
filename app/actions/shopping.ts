"use server";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { applyFunding, applyPurchase, applyReimbursement } from "@/lib/cash";
import { assertChildren, assertMembers, log, money, text, today } from "@/lib/action-helpers";
import { requireParent, requirePermission, isParentRole } from "@/lib/security";

export async function addShoppingItemAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const { session, membership } = await requirePermission(spaceId, "shopping");
  const childId=text(formData,"childId")||null; if(childId) await assertChildren(membership.id,[childId]);
  const programItemId = text(formData, "programItemId") || null;
  if (programItemId) {
    const [programItem] = await db.select({ id: s.programItems.id }).from(s.programItems).where(and(eq(s.programItems.id, programItemId), eq(s.programItems.careSpaceId, spaceId))).limit(1);
    if (!programItem) throw new Error("INVALID_PROGRAM_ITEM");
  }
  const [list] = await db.select().from(s.shoppingLists).where(and(eq(s.shoppingLists.careSpaceId, spaceId), eq(s.shoppingLists.active, true))).limit(1);
  if (!list) throw new Error("Liste de courses absente");
  await db.insert(s.shoppingItems).values({ shoppingListId: list.id, name: text(formData, "name"), quantity: text(formData, "quantity") || null, comment: text(formData, "comment") || null, childId, programItemId, createdBy: session.user.id });
  revalidatePath("/app");
}

async function settlePurchase(tx:any, args:{spaceId:string;memberId:string;userId:string;amount:number;expenseDate:string;description:string;itemIds:string[];action:string}){
  const [cash] = await tx.select().from(s.cashAccounts).where(eq(s.cashAccounts.careSpaceId, args.spaceId)).for("update").limit(1);
  if (!cash) throw new Error("Caisse absente");
  let [advance] = await tx.select().from(s.caregiverAdvances).where(and(eq(s.caregiverAdvances.careSpaceId, args.spaceId), eq(s.caregiverAdvances.memberId, args.memberId))).for("update").limit(1);
  if (!advance) [advance] = await tx.insert(s.caregiverAdvances).values({ careSpaceId: args.spaceId, memberId: args.memberId, balance: "0" }).returning();
  const result = applyPurchase(Number(cash.balance), Number(advance.balance), args.amount);
  const [expense] = await tx.insert(s.expenses).values({ careSpaceId: args.spaceId, memberId: args.memberId, amount: String(args.amount), description: args.description, expenseDate: args.expenseDate }).returning();
  await tx.update(s.cashAccounts).set({ balance: String(result.cashBalance), updatedAt: new Date() }).where(eq(s.cashAccounts.id, cash.id));
  await tx.update(s.caregiverAdvances).set({ balance: String(result.advanceBalance), updatedAt: new Date() }).where(eq(s.caregiverAdvances.id, advance.id));
  await tx.insert(s.cashTransactions).values({ cashAccountId: cash.id, kind: "PURCHASE", amount: String(-result.fromCash), expenseId: expense.id, memberId: args.memberId, note: `${args.description} · ${args.amount.toFixed(2)} €` });
  await tx.update(s.shoppingItems).set({ status: "DONE", purchasedAt: new Date(), purchasedByMemberId: args.memberId }).where(inArray(s.shoppingItems.id, args.itemIds));
  await log(tx, args.spaceId, args.userId, args.action, "expense", expense.id, { amount: args.amount, itemIds: args.itemIds, advanced: result.advanced });
}

async function purchaseContext(spaceId:string){
  const [space] = await db.select({ timezone: s.careSpaces.timezone }).from(s.careSpaces).where(eq(s.careSpaces.id, spaceId)).limit(1);
  if (!space) throw new Error("Espace introuvable");
  const [activeList]=await db.select().from(s.shoppingLists).where(and(eq(s.shoppingLists.careSpaceId,spaceId),eq(s.shoppingLists.active,true))).limit(1);
  if(!activeList) throw new Error("Liste de courses absente");
  return {expenseDate:today(space.timezone),activeList};
}

export async function purchaseShoppingItemAction(formData: FormData) {
  const spaceId=text(formData,"spaceId");
  const {session,membership}=await requirePermission(spaceId,"shopping");
  if(isParentRole(membership.role)) throw new Error("FORBIDDEN");
  const itemId=text(formData,"itemId");
  const amount=money(formData.get("amount"));
  if(!itemId||!Number.isFinite(amount)||amount<=0) throw new Error("Produit et prix requis");
  const {expenseDate,activeList}=await purchaseContext(spaceId);
  const [item]=await db.select().from(s.shoppingItems).where(and(eq(s.shoppingItems.id,itemId),eq(s.shoppingItems.shoppingListId,activeList.id),eq(s.shoppingItems.status,"TODO"))).limit(1);
  if(!item) throw new Error("Produit déjà acheté ou introuvable");
  if(item.childId) await assertChildren(membership.id,[item.childId]);
  await db.transaction(async tx=>{
    const [locked]=await tx.select().from(s.shoppingItems).where(and(eq(s.shoppingItems.id,itemId),eq(s.shoppingItems.shoppingListId,activeList.id),eq(s.shoppingItems.status,"TODO"))).for("update").limit(1);
    if(!locked) throw new Error("Produit déjà acheté");
    await settlePurchase(tx,{spaceId,memberId:membership.id,userId:session.user.id,amount,expenseDate,description:`Achat · ${locked.name}`,itemIds:[locked.id],action:"SHOPPING_ITEM_PURCHASED"});
  });
  revalidatePath("/app");
}

export async function recordDirectPurchaseAction(formData: FormData) {
  const spaceId=text(formData,"spaceId");
  const {session,membership}=await requirePermission(spaceId,"shopping");
  if(isParentRole(membership.role)) throw new Error("FORBIDDEN");
  const name=text(formData,"name");
  const amount=money(formData.get("amount"));
  const childId=text(formData,"childId")||null;
  if(!name||!Number.isFinite(amount)||amount<=0) throw new Error("Produit et prix requis");
  if(childId) await assertChildren(membership.id,[childId]);
  const {expenseDate,activeList}=await purchaseContext(spaceId);
  await db.transaction(async tx=>{
    const [item]=await tx.insert(s.shoppingItems).values({shoppingListId:activeList.id,name,childId,status:"TODO",createdBy:session.user.id}).returning();
    await settlePurchase(tx,{spaceId,memberId:membership.id,userId:session.user.id,amount,expenseDate,description:`Achat · ${name}`,itemIds:[item.id],action:"DIRECT_PURCHASE_RECORDED"});
  });
  revalidatePath("/app");
}

export async function completeShoppingPurchaseAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const { session, membership } = await requirePermission(spaceId, "shopping");
  if (isParentRole(membership.role)) throw new Error("FORBIDDEN");
  const amount = money(formData.get("amount"));
  const itemIds = formData.getAll("itemIds").map(String);
  if (!Number.isFinite(amount) || amount <= 0 || itemIds.length === 0) throw new Error("Sélectionnez les produits achetés et un montant valide");
  const {expenseDate,activeList}=await purchaseContext(spaceId);
  const validItems=await db.select().from(s.shoppingItems).where(and(eq(s.shoppingItems.shoppingListId,activeList.id),inArray(s.shoppingItems.id,itemIds),eq(s.shoppingItems.status,"TODO")));
  if(validItems.length!==new Set(itemIds).size) throw new Error("INVALID_SHOPPING_ITEMS");
  for(const item of validItems){if(item.childId) await assertChildren(membership.id,[item.childId]);}
  await db.transaction(async tx => {
    await settlePurchase(tx,{spaceId,memberId:membership.id,userId:session.user.id,amount,expenseDate,description:text(formData,"description")||"Courses",itemIds,action:"SHOPPING_PURCHASE_COMPLETED"});
  });
  revalidatePath("/app");
}

export async function addCashAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const { session } = await requireParent(spaceId);
  const amount = money(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Montant invalide");
  const memberId = text(formData, "memberId") || null;
  if(memberId) await assertMembers(spaceId,[memberId]);
  await db.transaction(async tx => {
    const [cash] = await tx.select().from(s.cashAccounts).where(eq(s.cashAccounts.careSpaceId, spaceId)).for("update").limit(1);
    if (!cash) throw new Error("Caisse absente");
    let advanceBalance = 0;
    let advanceRow: typeof s.caregiverAdvances.$inferSelect | undefined;
    if (memberId) {
      [advanceRow] = await tx.select().from(s.caregiverAdvances).where(and(eq(s.caregiverAdvances.careSpaceId, spaceId), eq(s.caregiverAdvances.memberId, memberId))).for("update").limit(1);
      advanceBalance = Number(advanceRow?.balance || 0);
    }
    const result = applyFunding(Number(cash.balance), advanceBalance, amount);
    await tx.update(s.cashAccounts).set({ balance: String(result.cashBalance), updatedAt: new Date() }).where(eq(s.cashAccounts.id, cash.id));
    if (advanceRow && result.reimbursedAdvance > 0) {
      await tx.update(s.caregiverAdvances).set({ balance: String(result.advanceBalance), updatedAt: new Date() }).where(eq(s.caregiverAdvances.id, advanceRow.id));
      await tx.insert(s.reimbursements).values({ careSpaceId: spaceId, memberId: advanceRow.memberId, amount: String(result.reimbursedAdvance), note: "Remboursement automatique lors du rechargement de caisse", reimbursedBy: session.user.id });
    }
    await tx.insert(s.cashTransactions).values({ cashAccountId: cash.id, kind: "FUND", amount: String(amount), memberId, note: "Argent ajouté par un parent" });
  });
  revalidatePath("/app");
}

export async function reimburseAdvanceAction(formData: FormData) {
  const spaceId = text(formData, "spaceId");
  const { session } = await requireParent(spaceId);
  const memberId = text(formData, "memberId");
  const amount = money(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Montant invalide");
  await assertMembers(spaceId,[memberId]);
  await db.transaction(async tx => {
    const [advance] = await tx.select().from(s.caregiverAdvances).where(and(eq(s.caregiverAdvances.careSpaceId, spaceId), eq(s.caregiverAdvances.memberId, memberId))).for("update").limit(1);
    if (!advance) throw new Error("Aucune avance");
    const result = applyReimbursement(Number(advance.balance), amount);
    await tx.update(s.caregiverAdvances).set({ balance: String(result.advanceBalance), updatedAt: new Date() }).where(eq(s.caregiverAdvances.id, advance.id));
    await tx.insert(s.reimbursements).values({ careSpaceId: spaceId, memberId, amount: String(amount), reimbursedBy: session.user.id });
  });
  revalidatePath("/app");
}
