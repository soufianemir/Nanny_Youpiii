import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireUser, isAdminRole, isParentRole, hasPermission } from "@/lib/security";
import { spacesForUser, spaceSnapshot } from "@/lib/data";
import { usersByIds } from "@/lib/directory";
import { serverConfigured } from "@/lib/env";
import { canSeeCashFromPermissions, sectionDate } from "@/lib/coherence";
import { normalizeMoreArea, normalizeSection, quickKinds, visiblePrimaryNav, type V4QuickKind } from "@/lib/v4-navigation";
import { SignOutButton } from "@/components/auth-forms";
import { AutoRefresh } from "@/components/auto-refresh";
import { AppHeader, AppShell, BottomNavigation } from "@/components/ui/app-shell";
import { QuickAdd, type QuickAddOption } from "@/components/ui/quick-add";
import { Icon } from "@/components/ui/icons";
import { Today } from "@/components/app/today";
import { Planning } from "@/components/app/planning";
import { Journal } from "@/components/app/journal";
import { ShoppingCash } from "@/components/app/shopping-cash";
import { ChildrenPanel } from "@/components/app/children-panel";
import { TeamPanel } from "@/components/app/team-panel";
import { RulesPanel } from "@/components/app/rules-panel";
import { MoreHub } from "@/components/app/more-hub";
import { roleLabel, today } from "@/components/app/utils";

export const dynamic = "force-dynamic";

const quickMeta:Record<V4QuickKind,{label:string;description:string;icon:QuickAddOption["icon"]}>={
  activity:{label:"Activité",description:"Ajouter au planning",icon:"activity"},
  task:{label:"Tâche",description:"Une action à ne pas oublier",icon:"task"},
  instruction:{label:"Consigne",description:"Important, interdit ou habitude",icon:"alert"},
  shopping:{label:"Course",description:"Ajouter un produit à acheter",icon:"shopping"},
  shift:{label:"Garde",description:"Ajouter une garde ponctuelle",icon:"people"},
};

export default async function AppPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  if(!serverConfigured())redirect("/");
  const session=await requireUser();
  const params=await searchParams;
  const spaces=await spacesForUser(session.user.id);
  if(!spaces.length)redirect("/onboarding");

  const selectedSpaceId=params.space&&spaces.some(item=>item.space.id===params.space)?params.space:spaces[0].space.id;
  const own=spaces.find(item=>item.space.id===selectedSpaceId)!;
  const actualMembership=own.member;
  const parent=isParentRole(actualMembership.role);
  const admin=isAdminRole(actualMembership.role);
  const parentChildIds=parent?(await db.select({childId:s.memberChildren.childId}).from(s.memberChildren).where(eq(s.memberChildren.memberId,actualMembership.id))).map(item=>item.childId):[];
  const todayIso=today(own.space.timezone);

  let viewMembership=actualMembership;
  let preview=false;
  if(parent&&params.preview){
    const [candidate]=await db.select().from(s.members).where(and(eq(s.members.id,params.preview),eq(s.members.careSpaceId,selectedSpaceId),eq(s.members.status,"ACTIVE"))).limit(1);
    if(candidate&&!isParentRole(candidate.role)){
      const targetChildIds=(await db.select({childId:s.memberChildren.childId}).from(s.memberChildren).where(eq(s.memberChildren.memberId,candidate.id))).map(item=>item.childId);
      if(targetChildIds.some(id=>parentChildIds.includes(id))){viewMembership=candidate;preview=true;}
    }
  }

  const canProgram=hasPermission(viewMembership,"program");
  const canTasks=hasPermission(viewMembership,"tasks");
  const canPlanning=canProgram||canTasks;
  const canJournal=hasPermission(viewMembership,"journal");
  const canShopping=hasPermission(viewMembership,"shopping");
  const requestedCashVisibility=canSeeCashFromPermissions(canShopping,hasPermission(viewMembership,"cash"));
  const section=normalizeSection(params.section,canPlanning,canJournal);
  const moreArea=normalizeMoreArea(params.section,params.area);
  const selectedDate=sectionDate(section,params.date||todayIso,todayIso);
  const snapshot=await spaceSnapshot(selectedSpaceId,viewMembership,selectedDate,preview?actualMembership:undefined);

  const rawTeam=parent?await db.select().from(s.members).where(and(eq(s.members.careSpaceId,selectedSpaceId),eq(s.members.status,"ACTIVE"))).orderBy(asc(s.members.createdAt)):[actualMembership];
  const rawTeamLinks=parent&&rawTeam.length?await db.select().from(s.memberChildren).where(inArray(s.memberChildren.memberId,rawTeam.map(member=>member.id))):[];
  const sharesParentChild=(memberId:string)=>memberId===actualMembership.id||rawTeamLinks.some(link=>link.memberId===memberId&&parentChildIds.includes(link.childId));
  const fullTeam=parent&&!admin?rawTeam.filter(member=>sharesParentChild(member.id)):rawTeam;
  const previewableMemberIds=new Set(fullTeam.filter(member=>!isParentRole(member.role)&&sharesParentChild(member.id)).map(member=>member.id));
  const journalMemberIds=new Set<string>([...fullTeam.map(member=>member.id),...snapshot.handovers.flatMap(handover=>[handover.fromMemberId,...(handover.toMemberId?[handover.toMemberId]:[])])]);
  const journalMembers=journalMemberIds.size?await db.select().from(s.members).where(and(eq(s.members.careSpaceId,selectedSpaceId),inArray(s.members.id,[...journalMemberIds]))):[];
  const directory=await usersByIds([...new Set([...fullTeam,...journalMembers].map(member=>member.userId))]);
  const memberName=(member:typeof s.members.$inferSelect)=>directory.get(member.userId)?.name||member.label||roleLabel(member.role);

  const invitations=admin?await db.select().from(s.invitations).where(eq(s.invitations.careSpaceId,selectedSpaceId)).orderBy(desc(s.invitations.createdAt)):[];
  const routines=parent&&hasPermission(actualMembership,"tasks")?await db.select().from(s.routines).where(eq(s.routines.careSpaceId,selectedSpaceId)):[];
  const scheduleRules=parent&&hasPermission(actualMembership,"program")?await db.select().from(s.scheduleRules).where(eq(s.scheduleRules.careSpaceId,selectedSpaceId)):[];
  const caregivers=fullTeam.filter(member=>!isParentRole(member.role));

  const q=(extra:Record<string,string>)=>{
    const query=new URLSearchParams({space:selectedSpaceId,date:selectedDate,...(preview?{preview:viewMembership.id}:{})});
    for(const [key,value] of Object.entries(extra)){if(value)query.set(key,value);else query.delete(key);}
    return `/app?${query}`;
  };
  const navItems=visiblePrimaryNav({canPlanning,canJournal}).map(item=>({id:item.id,label:item.label,icon:item.icon,href:q({section:item.id,date:sectionDate(item.id,selectedDate,todayIso)})}));

  const canChildren=parent&&!preview&&hasPermission(actualMembership,"children");
  const canManageRules=parent&&!preview&&(hasPermission(actualMembership,"journal")||hasPermission(actualMembership,"tasks"));
  const canManageCash=parent&&!preview&&hasPermission(actualMembership,"cash")&&Boolean(snapshot.cash);
  const canSeeCash=requestedCashVisibility&&Boolean(snapshot.cash);
  const canActProgram=!preview&&hasPermission(actualMembership,"program");
  const canActTasks=!preview&&hasPermission(actualMembership,"tasks");
  const canAddShopping=!preview&&hasPermission(actualMembership,"shopping");
  const canPurchase=!preview&&!parent&&hasPermission(actualMembership,"shopping");

  const quickOptions:QuickAddOption[]=quickKinds({parent:parent&&!preview,canProgram:hasPermission(actualMembership,"program"),canTasks:hasPermission(actualMembership,"tasks"),canJournal:hasPermission(actualMembership,"journal"),canShopping:hasPermission(actualMembership,"shopping"),canAdmin:admin}).map(kind=>{
    const meta=quickMeta[kind];
    const href=kind==="activity"?q({section:"planning",compose:"activity"}):kind==="task"?q({section:"planning",compose:"task"}):kind==="instruction"?q({section:"more",area:"rules",compose:"instruction"}):kind==="shopping"?q({section:"more",area:"shopping",compose:"shopping"}):q({section:"more",area:"team",compose:"shift"});
    return {...meta,href};
  });

  const header=<AppHeader spaceName={own.space.name} context={preview?`Vue ${memberName(viewMembership)}`:own.space.name} action={<SignOutButton/>}/>;
  const navigation=<BottomNavigation items={navItems} activeId={section}/>;

  return <AppShell header={header} navigation={navigation} floatingAction={<QuickAdd options={quickOptions}/>}>
    <AutoRefresh/>
    {preview&&<div className="v4-preview"><span><Icon name="eye" size={17}/> Vue de <strong>{memberName(viewMembership)}</strong>{snapshot.previewRestricted?" · filtrée à vos enfants":""}</span><Link className="v4-text-action" href={`/app?space=${selectedSpaceId}&section=today&date=${todayIso}`}>Quitter</Link></div>}

    {section==="today"&&<Today spaceId={selectedSpaceId} selectedDate={selectedDate} snapshot={snapshot} memberName={memberName} actualMembership={actualMembership} viewMembership={viewMembership} parent={parent} preview={preview} q={q} fullTeam={fullTeam} userFirstName={session.user.name?.split(" ")[0]||""} canActProgram={canActProgram} canActTasks={canActTasks} timezone={own.space.timezone}/>} 

    {section==="planning"&&<Planning spaceId={selectedSpaceId} selectedDate={selectedDate} snapshot={snapshot} caregivers={caregivers} children={snapshot.children} routines={routines} memberName={memberName} canEditProgram={parent&&!preview&&hasPermission(actualMembership,"program")} canEditTasks={parent&&!preview&&hasPermission(actualMembership,"tasks")} canActProgram={canActProgram} canActTasks={canActTasks} q={q} timezone={own.space.timezone} compose={params.compose}/>} 

    {section==="journal"&&<Journal spaceId={selectedSpaceId} selectedDate={selectedDate} snapshot={snapshot} team={journalMembers} memberName={memberName} canAdd={!preview&&hasPermission(actualMembership,"journal")} q={q} compose={params.compose}/>} 

    {section==="more"&&moreArea==="home"&&<MoreHub q={q} parent={parent&&!preview} canChildren={canChildren} canTeam={parent&&!preview} canShopping={canShopping} canCash={canSeeCash} canRules={canManageRules}/>} 
    {section==="more"&&moreArea==="children"&&canChildren&&<ChildrenPanel spaceId={selectedSpaceId} children={snapshot.children} canEdit={canChildren} q={q} compose={params.compose}/>} 
    {section==="more"&&moreArea==="team"&&parent&&!preview&&<TeamPanel spaceId={selectedSpaceId} team={fullTeam} children={snapshot.children} invitations={invitations} memberName={memberName} selectedDate={selectedDate} q={q} scheduleRules={scheduleRules} memberChildLinks={rawTeamLinks} canAdmin={admin} previewableMemberIds={previewableMemberIds} compose={params.compose}/>} 
    {section==="more"&&(moreArea==="shopping"||moreArea==="cash")&&(canShopping||canSeeCash)&&<ShoppingCash spaceId={selectedSpaceId} snapshot={snapshot} team={fullTeam} children={snapshot.children} memberName={memberName} viewMembership={viewMembership} parent={parent&&!preview} canAdd={canAddShopping} canPurchase={canPurchase} canSeeCash={canSeeCash} canManageCash={canManageCash} q={q} compose={params.compose}/>} 
    {section==="more"&&moreArea==="rules"&&parent&&!preview&&<RulesPanel spaceId={selectedSpaceId} snapshot={snapshot} team={fullTeam} routines={routines} canManage={canManageRules} q={q} compose={params.compose}/>} 
  </AppShell>;
}
