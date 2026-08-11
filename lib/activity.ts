export const activityTypes = [
  { key: "MEAL", label: "Repas" },
  { key: "NAP", label: "Sieste" },
  { key: "TOILET", label: "Bain / toilette" },
  { key: "BEDTIME", label: "Coucher" },
  { key: "SCHOOL", label: "École / trajet" },
  { key: "PLAY", label: "Jeu / sortie" },
  { key: "MEDICINE", label: "Médicament" },
  { key: "HEALTH", label: "Santé / incident" },
  { key: "MOOD", label: "Humeur / observation" },
  { key: "OTHER", label: "Autre" },
] as const;

export const DEFAULT_ACTIVITY_PRESETS = ["Repas", "Sieste", "Bain / toilette", "Sortie"] as const;
export const ACTIVITY_LIBRARY_ROUTINE_NAME = "__NANNY_YOUPIII_ACTIVITY_LIBRARY__";
export const MAX_ACTIVITY_PRESETS = 10;

export type ActivityTypeKey = typeof activityTypes[number]["key"];

export function activityDefinition(key: string) {return activityTypes.find(item => item.key === key) || activityTypes[activityTypes.length - 1];}

export function activityKeyFromStored(type?: string | null, title?: string | null): ActivityTypeKey {
  const haystack = `${type || ""} ${title || ""}`.toLocaleLowerCase("fr-FR");
  if (haystack.includes("repas") || haystack.includes("déjeuner") || haystack.includes("dîner") || haystack.includes("goûter") || haystack.includes("biberon") || haystack.includes("petit-déjeuner")) return "MEAL";
  if (haystack.includes("sieste")) return "NAP";
  if (haystack.includes("bain") || haystack.includes("toilette") || haystack.includes("couche")) return "TOILET";
  if (haystack.includes("coucher") || haystack.includes("dodo") || haystack.includes("histoire")) return "BEDTIME";
  if (haystack.includes("école") || haystack.includes("trajet") || haystack.includes("devoir")) return "SCHOOL";
  if (haystack.includes("jeu") || haystack.includes("sortie") || haystack.includes("parc") || haystack.includes("piscine") || haystack.includes("escalade") || haystack.includes("sport") || haystack.includes("promenade")) return "PLAY";
  if (haystack.includes("médicament")) return "MEDICINE";
  if (haystack.includes("incident") || haystack.includes("santé")) return "HEALTH";
  if (haystack.includes("humeur") || haystack.includes("observation")) return "MOOD";
  return "OTHER";
}

// A scheduled activity never becomes DONE because the clock passed its time.
// DONE is always an explicit human action (or an activity added as “Maintenant”).
export function activityStatusFor(timing:"NOW"|"SCHEDULED"):"DONE"|"PLANNED"{return timing==="NOW"?"DONE":"PLANNED";}
