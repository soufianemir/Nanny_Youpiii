import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireUser, isParentRole } from "@/lib/security";
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
  const section=params.section||"today";
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
  const nav=parent&&!preview
    ?[["today","Aujourd’hui"],["children","Enfants"],["team","Équipe"],["program","Programme"],["shopping","Courses"],["cash","Caisse"],["more","Plus"]]
    :[["today","Aujourd’hui"],["program","Programme"],["shopping","Courses"],["cash","Caisse"],["more","Plus"]];
  const q=(extra:Record<string,string>)=>{const p=new URLSearchParams({space:selectedSpaceId,date:selectedDate,...(preview?{preview:viewMembership.id}:{}),...extra});return `/app?${p}`};

  return <div className="shell"><header className="top"><div className="topin"><div className="brand"><div className="logo">Y!</div><div><div>Nanny Youpiii</div><small className="muted">{own.space.name}</small></div></div><SignOutButton/></div></header>
    <main className="main">
      {spaces.length>1&&<div className="tabs" style={{marginBottom:12}}>{spaces.map(x=><Link key={x.space.id} className={x.space.id===selectedSpaceId?"active":""} href={`/app?space=${x.space.id}`}>{x.space.name}</Link>)}</div>}
      {preview&&<div className="preview row between"><span>👀 Prévisualisation parent — vous voyez exactement l’interface de <b>{memberName(viewMembership)}</b>. Les actions sont désactivées.</span><Link className="btn soft" href={`/app?space=${selectedSpaceId}&date=${selectedDate}&section=today`}>Quitter</Link></div>}
      <div className="tabs" style={{margin:"12px 0 18px"}}>{nav.map(([id,label])=><Link key={id} className={section===id?"active":""} href={q({section:id})}>{label}</Link>)}</div>
      {section==="today"&&<Today spaceId={selectedSpaceId} selectedDate={selectedDate} snapshot={snapshot} memberName={memberName} actualMembership={actualMembership} viewMembership={viewMembership} parent={parent} preview={preview} q={q} fullTeam={fullTeam} userFirstName={session.user.name?.split(" ")[0]||""}/>} 
      {section==="children"&&parent&&!preview&&<Children spaceId={selectedSpaceId} children={snapshot.children}/>} 
      {section==="team"&&parent&&!preview&&<Team spaceId={selectedSpaceId} team={fullTeam} children={snapshot.children} invitations={invitations} memberName={memberName} selectedDate={selectedDate} q={q} scheduleRules={scheduleRules}/>} 
      {section==="program"&&<Program spaceId={selectedSpaceId} selectedDate={selectedDate} snapshot={snapshot} caregivers={caregiverMembers} children={snapshot.children} routines={routines} memberName={memberName} canEdit={parent&&!preview} canAct={!preview}/>} 
      {section==="shopping"&&<Shopping spaceId={selectedSpaceId} snapshot={snapshot} canAdd={!preview} canPurchase={!preview&&!parent} children={snapshot.children}/>} 
      {section==="cash"&&<Cash spaceId={selectedSpaceId} snapshot={snapshot} team={fullTeam} memberName={memberName} parent={parent&&!preview} viewMembership={viewMembership}/>} 
      {section==="more"&&<More spaceId={selectedSpaceId} snapshot={snapshot} team={fullTeam} children={snapshot.children} memberName={memberName} parent={parent&&!preview} canAct={!preview} routines={routines} selectedDate={selectedDate}/>} 
    </main>
    <nav className="nav">{nav.map(([id,label])=><Link key={id} className={section===id?"active":""} href={q({section:id})}>{label}</Link>)}</nav>
  </div>;
}
