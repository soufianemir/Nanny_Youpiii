import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireUser, isParentRole, hasPermission } from "@/lib/security";
import { spacesForUser, spaceSnapshot } from "@/lib/data";
import { usersByIds } from "@/lib/directory";
import { serverConfigured } from "@/lib/env";
import { SignOutButton } from "@/components/auth-forms";
import { Today } from "@/components/app/today";
import { Children, Team } from "@/components/app/people";
import { Program, Shopping } from "@/components/app/program-shopping";
import { Cash, More } from "@/components/app/cash-more";
import { roleLabel, today } from "@/components/app/utils";

export const dynamic = "force-dynamic";

export default async function AppPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  if(!serverConfigured()) redirect("/");
  const session=await requireUser();
  const params=await searchParams;
  const spaces=await spacesForUser(session.user.id);
  if(!spaces.length) redirect("/onboarding");
  const selectedSpaceId=params.space && spaces.some(x=>x.space.id===params.space)?params.space:spaces[0].space.id;
  const own=spaces.find(x=>x.space.id===selectedSpaceId)!;
  const actualMembership=own.member;
  const parent=isParentRole(actualMembership.role);
  const requestedSection=params.section||"today";
  const normalizedSection=requestedSection==="program"?"planning":requestedSection==="cash"?"shopping":["children","team","more"].includes(requestedSection)?"config":requestedSection;
  const selectedDate=params.date||today(own.space.timezone);
  let viewMembership=actualMembership;
  let preview=false;
  if(parent&&params.preview){
    const [m]=await db.select().from(s.members).where(and(eq(s.members.id,params.preview),eq(s.members.careSpaceId,selectedSpaceId),eq(s.members.status,"ACTIVE"))).limit(1);
    if(m&&!isParentRole(m.role)){viewMembership=m;preview=true;}
  }
  const snapshot=await spaceSnapshot(selectedSpaceId,viewMembership,selectedDate);
  const fullTeam=parent?await db.select().from(s.members).where(and(eq(s.members.careSpaceId,selectedSpaceId),eq(s.members.status,"ACTIVE"))).orderBy(asc(s.members.createdAt)):[actualMembership];
  const directory=await usersByIds(fullTeam.map(m=>m.userId));
  const memberName=(m:typeof s.members.$inferSelect)=>directory.get(m.userId)?.name||m.label||roleLabel(m.role);
  const invitations=parent?await db.select().from(s.invitations).where(eq(s.invitations.careSpaceId,selectedSpaceId)).orderBy(desc(s.invitations.createdAt)):[];
  const routines=parent?await db.select().from(s.routines).where(eq(s.routines.careSpaceId,selectedSpaceId)):[];
  const scheduleRules=parent?await db.select().from(s.scheduleRules).where(eq(s.scheduleRules.careSpaceId,selectedSpaceId)):[];
  const caregiverMembers=fullTeam.filter(m=>!isParentRole(m.role));
  const memberChildLinks=parent&&fullTeam.length?await db.select().from(s.memberChildren).where(inArray(s.memberChildren.memberId,fullTeam.map(m=>m.id))):[];
  const canPlanning=parent&&!preview||hasPermission(viewMembership,"program")||hasPermission(viewMembership,"tasks");
  const canShopping=parent&&!preview||hasPermission(viewMembership,"shopping")||hasPermission(viewMembership,"cash");
  const canSeeCash=parent&&!preview||hasPermission(viewMembership,"cash");
  const canJournal=parent&&!preview||hasPermission(viewMembership,"journal");
  const nav=parent&&!preview
    ?[["today","Aujourd’hui"],["planning","Planning"],["shopping","Courses & caisse"],["config","Configuration"]]
    :[["today","Aujourd’hui"],...(canPlanning?[["planning","Planning"]]:[]),...(canShopping?[["shopping","Courses & caisse"]]:[])];
  const section=nav.some(([id])=>id===normalizedSection)?normalizedSection:"today";
  const q=(extra:Record<string,string>)=>{const p=new URLSearchParams({space:selectedSpaceId,date:selectedDate,...(preview?{preview:viewMembership.id}:{}),...extra});return `/app?${p}`};

  return <div className="shell"><header className="top"><div className="topin"><div className="brand"><div className="logo">Y!</div><div><div>Nanny Youpiii</div><small className="muted">{own.space.name}</small></div></div><SignOutButton/></div></header>
    <main className="main">
      {preview&&<div className="preview row between wrap"><span>👀 Vous voyez exactement l’interface de <b>{memberName(viewMembership)}</b>. Aucune action n’est exécutée à sa place.</span><Link className="btn soft" href={`/app?space=${selectedSpaceId}&date=${selectedDate}&section=config`}>Quitter la prévisualisation</Link></div>}
      {section==="today"&&<><Today spaceId={selectedSpaceId} selectedDate={selectedDate} snapshot={snapshot} memberName={memberName} actualMembership={actualMembership} viewMembership={viewMembership} parent={parent} preview={preview} q={q} fullTeam={fullTeam} userFirstName={session.user.name?.split(" ")[0]||""}/>{(!parent||preview)&&<More spaceId={selectedSpaceId} snapshot={snapshot} team={fullTeam} children={snapshot.children} memberName={memberName} parent={false} canAct={canJournal&&!preview&&!parent} routines={[]} selectedDate={selectedDate}/>}</>}
      {section==="planning"&&<Program spaceId={selectedSpaceId} selectedDate={selectedDate} snapshot={snapshot} caregivers={caregiverMembers} children={snapshot.children} routines={routines} memberName={memberName} canEdit={parent&&!preview} canAct={!preview} q={q} timezone={own.space.timezone}/>} 
      {section==="shopping"&&<div className="stack"><Shopping spaceId={selectedSpaceId} snapshot={snapshot} canAdd={!preview} canPurchase={!preview&&!parent} children={snapshot.children} team={fullTeam} memberName={memberName} viewMembership={viewMembership} canSeeCash={canSeeCash}/>{parent&&!preview&&<Cash spaceId={selectedSpaceId} snapshot={snapshot} team={fullTeam} memberName={memberName} parent={true} viewMembership={viewMembership} embedded/>}</div>} 
      {section==="config"&&parent&&!preview&&<div className="stack">{spaces.length>1&&<section className="card"><div className="sectiontitle">Espaces de garde</div><div className="tabs" style={{marginTop:10}}>{spaces.map(x=><Link key={x.space.id} className={x.space.id===selectedSpaceId?"active":""} href={`/app?space=${x.space.id}&section=config`}>{x.space.name}</Link>)}</div></section>}<Children spaceId={selectedSpaceId} children={snapshot.children}/><Team spaceId={selectedSpaceId} team={fullTeam} children={snapshot.children} invitations={invitations} memberName={memberName} selectedDate={selectedDate} q={q} scheduleRules={scheduleRules} memberChildLinks={memberChildLinks}/><More spaceId={selectedSpaceId} snapshot={snapshot} team={fullTeam} children={snapshot.children} memberName={memberName} parent={true} canAct={false} routines={routines} selectedDate={selectedDate}/></div>} 
    </main>
    <nav className="nav">{nav.map(([id,label])=><Link key={id} className={section===id?"active":""} href={q({section:id})}>{label}</Link>)}</nav>
  </div>;
}
