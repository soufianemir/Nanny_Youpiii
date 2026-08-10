import Link from "next/link";
import type { members } from "@/db/schema";
import { spaceSnapshot } from "@/lib/data";
import { addDailyNoteAction, updateDailyNoteAction } from "@/app/actions/journal";
import { Icon } from "@/components/ui/icons";
import { Avatar, Card, EmptyState, PageTitle, SectionHeader, StatusBadge } from "@/components/ui/primitives";
import { journalIcon } from "@/lib/v4-presentation";
import { journalKindFromParam } from "@/lib/v4-journal";
import { dateLabel } from "./utils";

type Snapshot=Awaited<ReturnType<typeof spaceSnapshot>>;
type Member=typeof members.$inferSelect;
type DailyNote=Snapshot["notes"][number];
type Query=(extra:Record<string,string>)=>string;
type JournalProps={spaceId:string;selectedDate:string;snapshot:Snapshot;team:Member[];memberName:(member:Member)=>string;canAdd:boolean;currentMemberId:string;canEditAll:boolean;q:Query;compose?:string};
const labels:Record<string,string>={MEAL:"Repas",MOOD:"Humeur",ACTIVITY:"Activité",NAP:"Sieste",NOTE:"Note",TOILET:"Toilette",MEDICINE:"Médicament",INCIDENT:"Incident"};

function Multiline({text}:{text:string}){return <>{text.split("\n").map((line,index)=><span key={`${index}-${line}`}>{index>0&&<br/>}{line||" "}</span>)}</>}

function NoteSheet({spaceId,date,children,q,kind,note}:{spaceId:string;date:string;children:Snapshot["children"];q:Query;kind?:string;note?:DailyNote}){
  const close=q({section:"journal",compose:""});
  const initialKind=note?.kind||journalKindFromParam(kind);
  const editing=Boolean(note);
  const initialValue=note?[note.value,note.comment].filter(Boolean).join("\n"):"";
  const placeholder=initialKind==="MEAL"?"Brocolis\nPoulet\nYaourt":initialKind==="NAP"?"1 h 05":initialKind==="MOOD"?"Très bonne humeur":"Écrivez ce qui est utile…";
  return <div className="v4-compose-sheet"><Link className="v4-sheet-backdrop" href={close} aria-label="Fermer"/><section className="v4-bottom-sheet" role="dialog" aria-modal="true"><div className="v4-sheet-handle"/><div className="v4-sheet-heading"><div><span className="v4-eyebrow">Journal</span><h2>{editing?"Modifier":"Ajouter un moment"}</h2></div><Link href={close} className="v4-icon-button" aria-label="Fermer"><Icon name="close"/></Link></div><form className="v4-form" action={editing?updateDailyNoteAction:addDailyNoteAction}><input type="hidden" name="spaceId" value={spaceId}/><input type="hidden" name="date" value={date}/>{note&&<input type="hidden" name="noteId" value={note.id}/>}<div className="v4-field"><label>Type</label><select name="kind" defaultValue={initialKind}><option value="MEAL">Repas</option><option value="NAP">Sieste</option><option value="MOOD">Humeur</option><option value="ACTIVITY">Activité</option><option value="TOILET">Toilette</option><option value="MEDICINE">Médicament</option><option value="INCIDENT">Incident</option><option value="NOTE">Note</option></select></div><div className="v4-field"><label>Enfant</label><select name="childId" defaultValue={note?.childId||""}><option value="">Tous / général</option>{children.map(child=><option key={child.id} value={child.id}>{child.firstName}</option>)}</select></div><div className="v4-field"><label>Détails</label><textarea name="value" required autoFocus rows={6} defaultValue={initialValue} placeholder={placeholder}/><small>Vous pouvez écrire sur plusieurs lignes.</small></div><button className="btn brandbtn full">{editing?"Enregistrer":"Ajouter au journal"}</button></form></section></div>;
}

export function Journal({spaceId,selectedDate,snapshot,team,memberName,canAdd,currentMemberId,canEditAll,q,compose}:JournalProps){
  const childName=(id:string|null)=>snapshot.children.find(child=>child.id===id)?.firstName;
  const author=(memberId:string)=>{const member=team.find(item=>item.id===memberId);return member?memberName(member):"Intervenant"};
  const entries=[...snapshot.notes.map(note=>({id:`n-${note.id}`,noteId:note.id,memberId:note.memberId,at:note.createdAt,kind:"note" as const,icon:journalIcon(note.kind),title:labels[note.kind]||note.kind,body:note.value,comment:note.comment,author:author(note.memberId),child:childName(note.childId)})),...snapshot.handovers.map(handover=>({id:`h-${handover.id}`,noteId:null,memberId:handover.fromMemberId,at:handover.createdAt,kind:"handover" as const,icon:"handover" as const,title:"Passage de relais",body:handover.text,comment:null,author:author(handover.fromMemberId),child:undefined}))].sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime());
  const quick=(kind:string)=>q({section:"journal",compose:`journal-${kind}`});
  const composeKind=compose?.startsWith("journal-")?compose.slice("journal-".length):undefined;
  const editNoteId=compose?.startsWith("edit-note-")?compose.slice("edit-note-".length):undefined;
  const editNote=editNoteId?snapshot.notes.find(note=>note.id===editNoteId):undefined;
  return <div className="v4-stack"><PageTitle eyebrow="Journal" title={dateLabel(selectedDate)} description="Les moments utiles et les transmissions, dans l’ordre de la journée." action={canAdd?<Link className="btn brandbtn" href={quick("NOTE")}><Icon name="plus"/> Ajouter</Link>:undefined}/>
    {canAdd&&<Card tone="soft"><SectionHeader title="Ajouter en quelques secondes"/><div className="v4-quick-types"><Link href={quick("MEAL")} className="v4-quick-type"><Icon name="meal"/><span>Repas</span></Link><Link href={quick("NAP")} className="v4-quick-type"><Icon name="moon"/><span>Sieste</span></Link><Link href={quick("MOOD")} className="v4-quick-type"><Icon name="heart"/><span>Humeur</span></Link><Link href={quick("NOTE")} className="v4-quick-type"><Icon name="note"/><span>Note</span></Link></div></Card>}
    <Card>{entries.length?<div className="v4-journal">{entries.map(entry=>{const editable=entry.kind==="note"&&canAdd&&Boolean(entry.noteId)&&(canEditAll||entry.memberId===currentMemberId);return <article className="v4-journal-entry" key={entry.id}><span className="v4-journal-icon"><Icon name={entry.icon}/></span><div><div className="v4-journal-meta"><time>{new Intl.DateTimeFormat("fr-FR",{hour:"2-digit",minute:"2-digit"}).format(new Date(entry.at))}</time>{entry.kind==="handover"&&<StatusBadge tone="brand">Relais</StatusBadge>}{entry.child&&<StatusBadge>{entry.child}</StatusBadge>}{editable&&entry.noteId&&<Link className="v4-text-action" href={q({section:"journal",compose:`edit-note-${entry.noteId}`})}>Modifier</Link>}</div><h3>{entry.title}</h3><strong><Multiline text={entry.body}/></strong>{entry.comment&&<p><Multiline text={entry.comment}/></p>}<div className="v4-journal-meta v4-journal-author"><Avatar name={entry.author} size="sm"/><span>{entry.author}</span></div></div></article>})}</div>:<EmptyState title="Le journal est encore vide" description="Les moments importants de la journée apparaîtront ici." icon="journal"/>}</Card>
    {(composeKind||editNote)&&<NoteSheet spaceId={spaceId} date={selectedDate} children={snapshot.children} q={q} kind={composeKind} note={editNote}/>} 
  </div>;
}
