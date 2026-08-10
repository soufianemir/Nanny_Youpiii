export const JOURNAL_KINDS=["MEAL","NAP","MOOD","ACTIVITY","TOILET","MEDICINE","INCIDENT","NOTE"] as const;
export type JournalKind=typeof JOURNAL_KINDS[number];

export function journalKindFromParam(value:string|undefined):JournalKind{
  return JOURNAL_KINDS.includes(value as JournalKind)?value as JournalKind:"NOTE";
}
