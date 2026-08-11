import type { IconName } from "@/components/ui/icons";

export type V4Section="today"|"planning"|"shopping"|"journal"|"more";
export type V4MoreArea="home"|"children"|"team"|"shopping"|"cash"|"history"|"rules"|"messages"|"reports"|"settings";
export type V4NavItem={id:V4Section;label:string;icon:IconName};
export type V4QuickKind="activity"|"task"|"instruction"|"shopping"|"shift";

export const PRIMARY_NAV:V4NavItem[]=[{id:"today",label:"Aujourd’hui",icon:"sun"},{id:"planning",label:"Planning",icon:"calendar"},{id:"shopping",label:"Courses",icon:"shopping"},{id:"more",label:"Plus",icon:"menu"}];
export function visiblePrimaryNav(args:{canPlanning:boolean;canShopping:boolean}){return PRIMARY_NAV.filter(item=>item.id!=="planning"||args.canPlanning).filter(item=>item.id!=="shopping"||args.canShopping);}
export function normalizeSection(section:string|undefined,canPlanning:boolean,canShopping:boolean):V4Section{const legacy=section==="journal"?"more":section==="cash"||section==="config"||section==="children"||section==="team"?"more":section==="program"?"planning":section;if(legacy==="planning"&&!canPlanning)return "today";if(legacy==="shopping"&&!canShopping)return "today";return legacy==="planning"||legacy==="shopping"||legacy==="more"?legacy:"today";}
export function normalizeMoreArea(section:string|undefined,area:string|undefined):V4MoreArea{const candidate=area||section;if(candidate==="journal")return "history";if(candidate==="children"||candidate==="team"||candidate==="shopping"||candidate==="cash"||candidate==="history"||candidate==="rules"||candidate==="messages"||candidate==="reports"||candidate==="settings")return candidate;return "home";}
export function quickKinds(args:{parent:boolean;canProgram:boolean;canTasks:boolean;canJournal:boolean;canShopping:boolean;canAdmin:boolean}):V4QuickKind[]{const values:V4QuickKind[]=[];if(args.parent&&(args.canProgram||args.canTasks))values.push("activity");if(args.parent&&args.canJournal)values.push("instruction");if(args.canShopping)values.push("shopping");if(args.parent&&args.canAdmin)values.push("shift");return values;}
