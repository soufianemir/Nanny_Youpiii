import Link from "next/link";
import type { members } from "@/db/schema";
import { spaceSnapshot } from "@/lib/data";
import { endShiftAction, startShiftAction } from "@/app/actions/schedule";
import { updateProgramStatusAction, updateTaskStatusAction } from "@/app/actions/program";
import { Icon, type IconName } from "@/components/ui/icons";
import { Avatar, Card, EmptyState, SectionHeader, StatusBadge } from "@/components/ui/primitives";
import { dateLabel, today } from "./utils";

type Snapshot=Awaited<ReturnType<typeof spaceSnapshot>>;
type Member=typeof members.$inferSelect;
type Query=(extra:Record<string,string>)=>string;

type TimelineRow={id:string;kind:"program"|"task";time:string|null;title:string;subtitle:string;status:string;icon:IconName;plannedEnd?:string|null};

function activityIcon(type:string,title:string):IconName{
  const value=`${type} ${title}`.toLowerCase();
  if(value.includes("école"))return "school";
  if(value.includes("repas")||value.includes("déjeuner")||value.includes("dîner")||value.includes("goûter"))return "meal";
  if(value.includes("parc")||value.includes("sortie"))return "park";
  if(value.includes("bain")||value.includes("toilette"))return "bath";
  if(value.includes("sac")||value.includes("affaire"))return "bag";
  if(value.includes("coucher")||value.includes("sieste"))return "moon";
  return type.toLowerCase().includes("tâche")?"task":"activity";
}

function timeline(snapshot:Snapshot):TimelineRow[]{
  const program=snapshot.program.map(item=>({id:item.id,kind:"program" as const,time:item.plannedStart,title:item.title,subtitle:item.description||item.location||item.type,status:item.status,icon:activityIcon(item.type,item.title),plannedEnd:item.plannedEnd}));
  const tasks=snapshot.tasks.map(item=>({id:item.id,kind:"task" as const,time:item.time,title:item.title,subtitle:item.description||item.note||"Tâche",status:item.status,icon:activityIcon("tâche",item.title)}));
  return [...program,...tasks].sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99"));
}

function TimelineAction({row,spaceId,enabled}:{row:TimelineRow;spaceId:string;enabled:boolean}){
  const done=row.status==="DONE";
  if(done)return <span className="v4-check-button is-done" aria-label="Terminé"><Icon name="check"/></span>;
  if(!enabled)return <StatusBadge>{row.status==="NOT_DONE"?"Non fait":"Prévu"}</StatusBadge>;
  if(row.kind==="program")return <form action={updateProgramStatusAction}><input type="hidden" name="spaceId" value={spaceId}/><input type="hidden" name="itemId" value={row.id}/><input type="hidden" name="status" value="DONE"/><input type="hidden" name="actualStart" value={row.time||""}/><input type="hidden" name="actualEnd" value={row.plannedEnd||row.time||""}/><button className="v4-check-button" aria-label={`Marquer ${row.title} comme terminé`}><Icon name="check"/></button></form>;
  return <form action={updateTaskStatusAction}><input type="hidden" name="spaceId" value={spaceId}/><input type="hidden" name="taskId" value={row.id}/><input type="hidden" name="status" value="DONE"/><button className="v4-check-button" aria-label={`Marquer ${row.title} comme terminé`}><Icon name="check"/></button></form>;
}

export function Today({spaceId,selectedDate,snapshot,memberName,viewMembership,parent,preview,q,fullTeam,userFirstName,canActProgram,canActTasks,timezone}:{
  spaceId:string;selectedDate:string;snapshot:Snapshot;memberName:(member:Member)=>string;actualMembership:Member;viewMembership:Member;parent:boolean;preview:boolean;q:Query;fullTeam:Member[];userFirstName:string;canActProgram:boolean;canActTasks:boolean;timezone:string;
}){
  const rows=timeline(snapshot);
  const important=snapshot.instructions.filter(item=>item.kind==="IMPORTANT"||item.kind==="FORBIDDEN"||item.kind==="ALLOWED");
  const activeShift=snapshot.shifts.find(item=>item.status==="ACTIVE")||snapshot.shifts.find(item=>item.status==="PLANNED")||snapshot.shifts[0];
  const shiftMember=(id:string)=>fullTeam.find(member=>member.id===id)||viewMembership;
  const next=rows.find(row=>row.status!=="DONE"&&row.status!=="NOT_DONE");
  const isToday=selectedDate===today(timezone);
  const canInteract=!preview&&isToday;
  const greeting=parent&&!preview?(userFirstName?`Bonjour ${userFirstName} 👋`:"Bonjour 👋"):`Bonjour ${memberName(viewMembership)} 👋`;

  return <div className="v4-stack">
    <div className="v4-today-hero"><span className="v4-eyebrow">{dateLabel(selectedDate)}</span><h1>{greeting}</h1><p>{parent&&!preview?"Votre journée familiale, sans bruit inutile.":"Votre garde, vos prochaines actions et les informations utiles."}</p>
      {snapshot.shifts.length>0&&<div className="v4-shift-strip">{snapshot.shifts.map(shift=>{const member=shiftMember(shift.memberId);return <div className="v4-shift-row" key={shift.id}><Avatar name={memberName(member)} size="sm"/><span className="v4-row-copy"><strong>{memberName(member)}</strong><small>{shift.plannedStart} → {shift.plannedEnd}{shift.status==="ACTIVE"?" · garde en cours":""}</small></span>{shift.status==="ACTIVE"&&<StatusBadge tone="success">En cours</StatusBadge>}</div>})}</div>}
    </div>

    {next&&<Card className="v4-now-card" tone="brand"><span className="v4-eyebrow">Ensuite</span><div className="v4-section-header"><div><h2 style={{marginBottom:4}}>{next.time?`${next.time} · `:""}{next.title}</h2><small className="muted">{next.subtitle}</small></div><span className="v4-timeline-icon"><Icon name={next.icon}/></span></div></Card>}

    <div className="v4-grid-2"><div className="v4-stack"><Card><SectionHeader title={parent&&!preview?"Aujourd’hui":"Ma journée"} eyebrow={rows.length?`${rows.filter(row=>row.status==="DONE").length}/${rows.length} terminé${rows.length>1?"s":""}`:undefined} action={<Link className="v4-text-action" href={q({section:"planning"})}>Planning</Link>}/>{rows.length?<div className="v4-timeline">{rows.map(row=><div key={`${row.kind}-${row.id}`} className={`v4-timeline-item ${row.status==="DONE"?"is-done":""}`}><time className="v4-timeline-time">{row.time||"—"}</time><span className="v4-timeline-rail"><span className="v4-timeline-icon"><Icon name={row.icon} size={18}/></span></span><span className="v4-timeline-copy"><strong>{row.title}</strong><small>{row.status==="DONE"?"Terminé":row.subtitle}</small></span><span className="v4-timeline-action"><TimelineAction row={row} spaceId={spaceId} enabled={canInteract&&(row.kind==="program"?canActProgram:canActTasks)}/></span></div>)}</div>:<EmptyState title="Rien de prévu aujourd’hui 🌿" description="Profitez d’une journée tranquille."/>}</Card></div>

      <div className="v4-stack">{important.length>0&&<Card><SectionHeader title="À savoir aujourd’hui"/><div className="v4-instruction-list">{important.map(item=><div key={item.id} className={`v4-instruction ${item.kind==="FORBIDDEN"?"danger":item.kind==="IMPORTANT"?"warning":""}`}><Icon name={item.kind==="FORBIDDEN"?"ban":item.kind==="IMPORTANT"?"alert":"headphones"} size={18}/><span>{item.text}</span></div>)}</div></Card>}

      {snapshot.handovers.length>0&&<Card><SectionHeader title="Transmission" eyebrow="Relais"/><div className="v4-stack">{snapshot.handovers.slice(0,3).map(handover=><div className="v4-list-row" key={handover.id}><span className="v4-row-icon"><Icon name="handover"/></span><span className="v4-row-copy"><strong>À transmettre</strong><small>{handover.text}</small></span></div>)}</div><Link href={q({section:"journal"})} className="v4-text-action">Voir le journal</Link></Card>}

      {!preview&&!parent&&isToday&&activeShift&&<Card tone={activeShift.status==="ACTIVE"?"brand":"default"}><SectionHeader title="Ma garde" eyebrow={`${activeShift.plannedStart} → ${activeShift.plannedEnd}`}/>{activeShift.status==="PLANNED"?<form action={startShiftAction}><input type="hidden" name="spaceId" value={spaceId}/><input type="hidden" name="shiftId" value={activeShift.id}/><button className="btn brandbtn full">Commencer la garde</button></form>:activeShift.status==="ACTIVE"?<form action={endShiftAction} className="v4-form"><input type="hidden" name="spaceId" value={spaceId}/><input type="hidden" name="shiftId" value={activeShift.id}/><div className="v4-field"><label htmlFor={`handover-${activeShift.id}`}>Transmission de fin de garde</label><textarea id={`handover-${activeShift.id}`} name="handover" placeholder="Goûter OK, un peu fatiguée, sac prêt…"/></div><button className="btn primary full">Terminer et transmettre</button></form>:<StatusBadge tone="success">Garde terminée</StatusBadge>}</Card>}
      </div>
    </div>
  </div>;
}
