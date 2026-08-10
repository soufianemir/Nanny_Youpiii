export const CARE_PERIOD_PREFIX="__CARE_PERIOD__:";

const ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;

export function carePeriodNote(start:string,end:string){
  return `${CARE_PERIOD_PREFIX}${start}:${end}`;
}

export function parseCarePeriodNote(note:string|null|undefined){
  if(!note?.startsWith(CARE_PERIOD_PREFIX))return null;
  const [start,end]=note.slice(CARE_PERIOD_PREFIX.length).split(":");
  if(!ISO_DATE.test(start||"")||!ISO_DATE.test(end||"")||start>end)return null;
  return {start,end};
}

export function datesInPeriod(start:string,end:string,maxDays=550){
  if(!ISO_DATE.test(start)||!ISO_DATE.test(end)||start>end)throw new Error("Période invalide");
  const cursor=new Date(`${start}T12:00:00Z`);
  const last=new Date(`${end}T12:00:00Z`);
  const values:string[]=[];
  while(cursor<=last){
    if(values.length>=maxDays)throw new Error("La période est trop longue");
    values.push(cursor.toISOString().slice(0,10));
    cursor.setUTCDate(cursor.getUTCDate()+1);
  }
  return values;
}

export function weekdayFromIso(date:string){
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function schoolYearPeriod(reference:string){
  if(!ISO_DATE.test(reference))throw new Error("Date invalide");
  const year=Number(reference.slice(0,4));
  const month=Number(reference.slice(5,7));
  const startYear=month>=8?year:year-1;
  return {start:`${startYear}-09-01`,end:`${startYear+1}-07-31`};
}
