import type { IconName } from "@/components/ui/icons";

export type V4Section="today"|"planning"|"journal"|"more";
export type V4MoreArea="home"|"children"|"team"|"shopping"|"cash"|"rules";
export type V4NavItem={id:V4Section;label:string;icon:IconName};
export type V4QuickKind="activity"|"task"|"instruction"|"shopping"|"shift";

export const PRIMARY_NAV:V4NavItem[]=[
  {id:"today",label:"Aujourd’hui",icon:"sun"},
  {id:"planning",label:"Planning",icon:"calendar"},
  {id:"journal",label:"Journal",icon:"journal"},
  {id:"more",label:"Plus",icon:"menu"},
];

export function visiblePrimaryNav(args:{canPlanning:boolean;canJournal:boolean}){
  return PRIMARY_NAV.filter(item=>item.id!=="planning"||args.canPlanning).filter(item=>item.id!=="journal"||args.canJournal);
}

export function normalizeSection(section:string|undefined,canPlanning:boolean,canJournal:boolean):V4Section{
  const legacy=section==="shopping"||section==="cash"||section==="config"||section==="children"||section==="team"||section==="more"?"more":section==="program"?"planning":section;
  if(legacy==="planning"&&!canPlanning)return "today";
  if(legacy==="journal"&&!canJournal)return "today";
  return legacy==="planning"||legacy==="journal"||legacy==="more"?legacy:"today";
}

export function normalizeMoreArea(section:string|undefined,area:string|undefined):V4MoreArea{
  const candidate=area||section;
  if(candidate==="children"||candidate==="team"||candidate==="shopping"||candidate==="cash"||candidate==="rules")return candidate;
  return "home";
}

export function quickKinds(args:{parent:boolean;canProgram:boolean;canTasks:boolean;canJournal:boolean;canShopping:boolean;canAdmin:boolean}):V4QuickKind[]{
  const values:V4QuickKind[]=[];
  if(args.parent&&args.canProgram)values.push("activity");
  if(args.parent&&args.canTasks)values.push("task");
  if(args.parent&&args.canJournal)values.push("instruction");
  if(args.canShopping)values.push("shopping");
  if(args.parent&&args.canAdmin)values.push("shift");
  return values;
}
