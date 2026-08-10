import type { IconName } from "@/components/ui/icons";

export function activityIcon(type:string,title:string):IconName{
  const value=`${type} ${title}`.toLowerCase();
  if(value.includes("école")||value.includes("crèche"))return "school";
  if(value.includes("repas")||value.includes("déjeuner")||value.includes("dîner")||value.includes("goûter"))return "meal";
  if(value.includes("parc")||value.includes("sortie")||value.includes("promenade"))return "park";
  if(value.includes("bain")||value.includes("toilette")||value.includes("douche"))return "bath";
  if(value.includes("sac")||value.includes("affaire"))return "bag";
  if(value.includes("coucher")||value.includes("sieste")||value.includes("dodo"))return "moon";
  if(value.includes("médicament"))return "pill";
  return type.toLowerCase().includes("tâche")?"task":"activity";
}

export function journalIcon(kind:string):IconName{
  const value=kind.toLowerCase();
  if(value.includes("meal")||value.includes("repas"))return "meal";
  if(value.includes("nap")||value.includes("sieste"))return "moon";
  if(value.includes("activity")||value.includes("activité"))return "activity";
  if(value.includes("incident"))return "alert";
  if(value.includes("med")||value.includes("méd"))return "pill";
  if(value.includes("mood")||value.includes("humeur"))return "heart";
  return "note";
}

export function shiftIsoDate(date:string,days:number){const value=new Date(`${date}T12:00:00`);value.setDate(value.getDate()+days);return value.toISOString().slice(0,10)}
export function clockLabel(value:Date|string|null|undefined){return value?new Intl.DateTimeFormat("fr-FR",{hour:"2-digit",minute:"2-digit"}).format(new Date(value)):null}
export function shortDay(date:string){return new Intl.DateTimeFormat("fr-FR",{weekday:"short",day:"numeric"}).format(new Date(`${date}T12:00:00`)).replace(".","")}
