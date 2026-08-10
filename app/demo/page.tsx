import Link from "next/link";
import { AppHeader, AppShell, BottomNavigation } from "@/components/ui/app-shell";
import { Icon } from "@/components/ui/icons";
import { Card } from "@/components/ui/primitives";
import { Today } from "@/components/app/today";
import { Planning } from "@/components/app/planning";
import { Journal } from "@/components/app/journal";
import { ShoppingCash } from "@/components/app/shopping-cash";
import { ChildrenPanel } from "@/components/app/children-panel";
import { TeamPanel } from "@/components/app/team-panel";
import { RulesPanel } from "@/components/app/rules-panel";
import { MoreHub } from "@/components/app/more-hub";
import { getDemoData } from "@/lib/demo-data";
import { PRIMARY_NAV, normalizeMoreArea, normalizeSection } from "@/lib/v4-navigation";
import { sectionDate } from "@/lib/coherence";
import type { members } from "@/db/schema";

type Caregiver="nora"|"sophie";type Member=typeof members.$inferSelect;
export default async function DemoPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const params=await searchParams;const data=getDemoData();const previewCaregiver:Caregiver|undefined=params.preview===data.sophie.id?"sophie":params.preview===data.nora.id?"nora":undefined;const role=params.role==="nanny"||previewCaregiver?"nanny":"parent";const caregiver:Caregiver=previewCaregiver||(params.caregiver==="sophie"?"sophie":"nora");const viewMembership=role==="parent"?data.parent:caregiver==="sophie"?data.sophie:data.nora;const snapshot=role==="parent"?data.parentSnapshot:caregiver==="sophie"?data.sophieSnapshot:data.noraSnapshot;const section=normalizeSection(params.section,true,true);const area=normalizeMoreArea(params.section,params.area);const selectedDate=sectionDate(section,params.date||data.date,data.date);const memberName=(member:Member)=>data.names.get(member.id)||member.label||member.role;
  const q=(extra:Record<string,string>)=>{let nextRole=role,nextCaregiver=caregiver;if(extra.preview===data.nora.id){nextRole="nanny";nextCaregiver="nora";}if(extra.preview===data.sophie.id){nextRole="nanny";nextCaregiver="sophie";}const query=new URLSearchParams({role:nextRole,...(nextRole==="nanny"?{caregiver:nextCaregiver}:{}),date:selectedDate});for(const [key,value] of Object.entries(extra)){if(key==="preview")continue;if(value)query.set(key,value);else query.delete(key);}return `/demo?${query}`;};
  const nav=PRIMARY_NAV.map(item=>({id:item.id,label:item.label,icon:item.icon,href:q({section:item.id,date:sectionDate(item.id,selectedDate,data.date)})}));const roleSwitch=<div className="v4-demo-switch"><Link className={role==="parent"?"is-active":""} href="/demo?role=parent&section=today">Parent</Link><Link className={role==="nanny"&&caregiver==="nora"?"is-active":""} href="/demo?role=nanny&caregiver=nora&section=today">Nora</Link><Link className={role==="nanny"&&caregiver==="sophie"?"is-active":""} href="/demo?role=nanny&caregiver=sophie&section=today">Sophie</Link></div>;
  return <AppShell header={<AppHeader spaceName={data.space.name} context={`Démo · ${role==="parent"?"Parent":memberName(viewMembership)}`} action={roleSwitch}/>} navigation={<BottomNavigation items={nav} activeId={section}/> }><div className="v4-demo-banner"><span><Icon name="eye" size={16}/> Mode démo · aucune donnée réelle</span><Link href="/auth/sign-up" className="v4-text-action">Créer mon espace</Link></div>
    {section==="today"&&<Today spaceId={data.space.id} selectedDate={data.date} snapshot={snapshot} memberName={memberName} actualMembership={viewMembership} viewMembership={viewMembership} parent={role==="parent"} preview={false} readOnly q={q} fullTeam={data.team} userFirstName={role==="parent"?"Camille":""} canActProgram={false} canActTasks={false} timezone={data.space.timezone}/>} 
    {section==="planning"&&<Planning spaceId={data.space.id} selectedDate={data.date} snapshot={snapshot} caregivers={role==="parent"?[data.nora,data.sophie]:[viewMembership]} children={snapshot.children} routines={role==="parent"?data.routines:[]} memberName={memberName} canActProgram={false} canActTasks={false} q={q} timezone={data.space.timezone}/>} 
    {section==="journal"&&<Journal selectedDate={data.date} snapshot={snapshot} team={data.team} memberName={memberName} canEditActivities={false} q={q}/>} 
    {section==="more"&&area==="home"&&<MoreHub q={q} parent={role==="parent"} canChildren={role==="parent"} canTeam={role==="parent"} canShopping={role==="parent"||caregiver==="nora"} canCash={role==="parent"||caregiver==="nora"} canRules={role==="parent"} personalTools={false}/>} 
    {section==="more"&&area==="children"&&role==="parent"&&<ChildrenPanel spaceId={data.space.id} children={data.children} canEdit={false} q={q}/>} 
    {section==="more"&&area==="team"&&role==="parent"&&<TeamPanel spaceId={data.space.id} team={data.team} children={data.children} invitations={[]} memberName={memberName} selectedDate={data.date} q={q} scheduleRules={data.scheduleRules} memberChildLinks={data.memberChildLinks} canAdmin={false} previewableMemberIds={new Set([data.nora.id,data.sophie.id])}/>} 
    {section==="more"&&area==="rules"&&role==="parent"&&<RulesPanel spaceId={data.space.id} snapshot={data.parentSnapshot} team={data.team} routines={data.routines} canManage={false} q={q}/>} 
    {section==="more"&&(area==="shopping"||area==="cash")&&(role==="parent"||caregiver==="nora")&&<ShoppingCash spaceId={data.space.id} snapshot={snapshot} team={data.team} children={snapshot.children} memberName={memberName} viewMembership={viewMembership} parent={role==="parent"} canAdd={false} canPurchase={false} canSeeCash={Boolean(snapshot.cash)} canManageCash={false} q={q}/>} 
    {section==="more"&&area==="home"&&role==="nanny"&&caregiver==="sophie"&&<Card tone="soft"><div className="v4-list-row"><span className="v4-row-icon"><Icon name="settings"/></span><span className="v4-row-copy"><strong>Accès minimal</strong><small>Sophie voit uniquement Aujourd’hui, Planning et Journal pour Lina.</small></span></div></Card>}
  </AppShell>;
}
