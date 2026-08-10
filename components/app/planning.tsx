import Link from "next/link";
import type { members } from "@/db/schema";
import { spaceSnapshot } from "@/lib/data";
import { updateProgramStatusAction, updateTaskStatusAction } from "@/app/actions/program";
import { Icon, type IconName } from "@/components/ui/icons";
import { Card, EmptyState, IconButton, PageTitle, SectionHeader, StatusBadge } from "@/components/ui/primitives";
import { activityIcon, clockLabel, shiftIsoDate, shortDay } from "@/lib/v4-presentation";
import { dateLabel, today } from "./utils";

type Snapshot=Awaited<ReturnType<typeof spaceSnapshot>>;
type Member=typeof members.$inferSelect;
type Query=(extra:Record<string,string>)=>string;
type PlanningProps={spaceId:string;selectedDate:string;snapshot:Snapshot;caregivers:Member[];memberName:(member:Member)=>string;canActProgram:boolean;canActTasks:boolean;q:Query;timezone:string};
type Entry={id:string;kind:"program"|"task"|"relay";time:string|null;title:string;subtitle:string;status:string;icon:IconName;actual:string;end:string|null};

function WeekStrip({selectedDate,q}:{selectedDate:string;q:Query}){
  const dates=Array.from({length:7},(_,index)=>shiftIsoDate(selectedDate,index-3));
  return <div className="v4-week-strip" aria-label="Semaine autour de la date sélectionnée">{dates.map(date=><Link key={date} href={q({section:"planning",date})} className={date===selectedDate?"is-active":""}><small>{shortDay(date).split(" ")[0]}</small><strong>{new Date(`${date}T12:00:00`).getDate()}</strong></Link>)}</div>;
}

export function Planning({spaceId,selectedDate,snapshot,caregivers,memberName,canActProgram,canActTasks,q,timezone}:PlanningProps){
  const todayIso=today(timezone);const canRealize=selectedDate<=todayIso;
  const programEntries:Entry[]=snapshot.program.map(item=>({id:item.id,kind:"program",time:item.plannedStart,title:item.title,subtitle:item.description||item.location||item.type,status:item.status,icon:activityIcon(item.type,item.title),actual:[clockLabel(item.actualStart),clockLabel(item.actualEnd)].filter(Boolean).join("–"),end:item.plannedEnd}));
  const taskEntries:Entry[]=snapshot.tasks.map(item=>({id:item.id,kind:"task",time:item.time,title:item.title,subtitle:item.description||item.note||"",status:item.status,icon:activityIcon("tâche",item.title),actual:"",end:null}));
  const orderedShifts=[...snapshot.shifts].sort((a,b)=>a.plannedStart.localeCompare(b.plannedStart));
  const caregiverName=(id:string)=>{const member=caregivers.find(candidate=>candidate.id===id);return member?memberName(member):"Intervenant";};
  const relayEntries:Entry[]=orderedShifts.slice(0,-1).flatMap((shift,index)=>{const next=orderedShifts[index+1];if(!next||shift.plannedEnd!==next.plannedStart||shift.memberId===next.memberId)return [];return [{id:`${shift.id}-${next.id}`,kind:"relay",time:next.plannedStart,title:"Relais",subtitle:`${caregiverName(shift.memberId)} → ${caregiverName(next.memberId)}`,status:"INFO",icon:"handover",actual:"",end:null}];});
  const entries=[...programEntries,...taskEntries,...relayEntries].sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99")||({program:0,relay:1,task:2}[a.kind]-{program:0,relay:1,task:2}[b.kind]));
  const mode=selectedDate===todayIso?"Aujourd’hui":selectedDate<todayIso?"Historique":"À venir";
  return <div className="v4-stack"><PageTitle eyebrow="Planning" title={dateLabel(selectedDate)} description="Les activités prévues. Touchez une activité pour la modifier."/>
    <Card className="v4-planning-nav"><div className="v4-date-nav"><IconButton href={q({section:"planning",date:shiftIsoDate(selectedDate,-1)})} label="Jour précédent" icon="chevronLeft"/><div className="v4-date-current"><strong>{mode}</strong>{selectedDate!==todayIso&&<Link className="v4-text-action" href={q({section:"planning",date:todayIso})}>Aujourd’hui</Link>}</div><IconButton href={q({section:"planning",date:shiftIsoDate(selectedDate,1)})} label="Jour suivant" icon="chevronRight"/></div><WeekStrip selectedDate={selectedDate} q={q}/></Card>
    <Card><SectionHeader title="Journée" eyebrow={`${entries.length} élément${entries.length>1?"s":""}`}/>{entries.length?<div className="v4-timeline">{entries.map(entry=>{const done=entry.status==="DONE";const act=entry.kind==="program"?canActProgram:entry.kind==="task"?canActTasks:false;return <div className={`v4-timeline-item ${done?"is-done":""} ${entry.kind==="relay"?"is-relay":""}`} key={`${entry.kind}-${entry.id}`}><time className="v4-timeline-time">{entry.time||"—"}</time><span className="v4-timeline-rail"><span className="v4-timeline-icon"><Icon name={entry.icon} size={18}/></span></span>{entry.kind==="program"?<Link className="v4-timeline-copy v4-activity-row-link" href={q({section:"planning",compose:`activity-edit-${entry.id}`})}><strong>{entry.title}</strong>{entry.subtitle&&<small>{done&&entry.actual?`Réalisé ${entry.actual}`:entry.subtitle}</small>}</Link>:<span className="v4-timeline-copy"><strong>{entry.title}</strong>{entry.subtitle&&<small>{entry.subtitle}</small>}</span>}<span className="v4-timeline-action">{entry.kind==="relay"?<StatusBadge tone="brand">Relais</StatusBadge>:done?<StatusBadge tone="success">Fait</StatusBadge>:entry.status==="NOT_DONE"?<StatusBadge tone="danger">Non fait</StatusBadge>:canRealize&&act?(entry.kind==="program"?<form action={updateProgramStatusAction}><input type="hidden" name="spaceId" value={spaceId}/><input type="hidden" name="itemId" value={entry.id}/><input type="hidden" name="status" value="DONE"/><input type="hidden" name="actualStart" value={entry.time||""}/><input type="hidden" name="actualEnd" value={entry.end||entry.time||""}/><button className="v4-check-button" aria-label={`Terminer ${entry.title}`}><Icon name="check"/></button></form>:<form action={updateTaskStatusAction}><input type="hidden" name="spaceId" value={spaceId}/><input type="hidden" name="taskId" value={entry.id}/><input type="hidden" name="status" value="DONE"/><button className="v4-check-button" aria-label={`Terminer ${entry.title}`}><Icon name="check"/></button></form>):<StatusBadge>Prévu</StatusBadge>}</span></div>})}</div>:<EmptyState title="Rien de prévu ce jour" description="Utilisez le + pour ajouter une activité." icon="calendar"/>}</Card>
  </div>;
}
