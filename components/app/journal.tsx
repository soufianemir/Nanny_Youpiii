import Link from "next/link";
import type { members } from "@/db/schema";
import { spaceSnapshot } from "@/lib/data";
import { addDailyNoteAction } from "@/app/actions/journal";
import { Icon } from "@/components/ui/icons";
import { Avatar, Card, EmptyState, PageTitle, SectionHeader, StatusBadge } from "@/components/ui/primitives";
import { journalIcon } from "@/lib/v4-presentation";
import { dateLabel } from "./utils";

type Snapshot=Awaited<ReturnType<typeof spaceSnapshot>>;
type Member=typeof members.$inferSelect;
type Query=(extra:Record<string,string>)=>string;
type JournalProps={spaceId:string;selectedDate:string;snapshot:Snapshot;team:Member[];memberName:(member:Member)=>string;canAdd:boolean;q:Query;compose?:string};
const labels:Record<string,string>={MEAL:"Repas",MOOD:"Humeur",ACTIVITY:"Activité",NAP:"Sieste",NOTE:"Note",TOILET:"Toilette",MEDICINE:"Médicament",INCIDENT:"Incident"};

function NoteSheet({spaceId,date,children,q}:{spaceId:string;date:string;children:Snapshot["children"];q:Query}){
  const close=q({section:"journal",compose:""});
  return <div className="v4-compose-sheet"><Link className="v4-sheet-backdrop" href={close} aria-label="Fermer"/><section className="v4-bottom-sheet" role="dialog" aria-modal="true"><div className="v4-sheet-handle"/><div className="v4-sheet-heading"><div><span className="v4-eyebrow">Journal</span><h2>Ajouter un moment</h2></div><Link href={close} className="v4-icon-button" aria-label="Fermer"><Icon name="close"/></Link></div><form className="v4-form" action={addDailyNoteAction}><input type="hidden" name="spaceId" value={spaceId}/><input type="hidden" name="date" value={date}/><div className="v4-field"><label>Type</label><select name="kind"><option value="MEAL">Repas</option><option value="NAP">Sieste</option><option value="MOOD">Humeur</option><option value="ACTIVITY">Activité</option><option value="TOILET">Toilette</option><option value="MEDICINE">Médicament</option><option value="INCIDENT">Incident</option><option value="NOTE">Note</option></select></div><div className="v4-field"><label>Enfant</label><select name="childId"><option value="">Tous / général</option>{children.map(child=><option key={child.id} value={child.id}>{child.firstName}</option>)}</select></div><div className="v4-field"><label>En bref</label><input name="value" required autoFocus placeholder="Tout mangé"/></div><div className="v4-field"><label>Commentaire</label><textarea name="comment" placeholder="Poulet, riz et courgettes…"/></div><button className="btn brandbtn full">Ajouter au journal</button></form></section></div>;
}

export function Journal({spaceId,selectedDate,snapshot,team,memberName,canAdd,q,compose}:JournalProps){
  const childName=(id:string|null)=>snapshot.children.find(child=>child.id===id)?.firstName;
  const author=(memberId:string)=>{const member=team.find(item=>item.id===memberId);return member?memberName(member):"Intervenant"};
  const entries=[...snapshot.notes.map(note=>({id:`n-${note.id}`,at:note.createdAt,kind:"note" as const,icon:journalIcon(note.kind),title:labels[note.kind]||note.kind,body:note.value,comment:note.comment,author:author(note.memberId),child:childName(note.childId)})),...snapshot.handovers.map(handover=>({id:`h-${handover.id}`,at:handover.createdAt,kind:"handover" as const,icon:"handover" as const,title:"Passage de relais",body:handover.text,comment:null,author:author(handover.fromMemberId),child:undefined}))].sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime());
  return <div className="v4-stack"><PageTitle eyebrow="Journal" title={dateLabel(selectedDate)} description="Les moments utiles et les transmissions, dans l’ordre de la journée." action={canAdd?<Link className="btn brandbtn" href={q({section:"journal",compose:"journal"})}><Icon name="plus"/> Ajouter</Link>:undefined}/>
    {canAdd&&<Card tone="soft"><SectionHeader title="Ajouter en quelques secondes"/><div className="v4-quick-types"><Link href={q({section:"journal",compose:"journal"})} className="v4-quick-type"><Icon name="meal"/><span>Repas</span></Link><Link href={q({section:"journal",compose:"journal"})} className="v4-quick-type"><Icon name="moon"/><span>Sieste</span></Link><Link href={q({section:"journal",compose:"journal"})} className="v4-quick-type"><Icon name="heart"/><span>Humeur</span></Link><Link href={q({section:"journal",compose:"journal"})} className="v4-quick-type"><Icon name="note"/><span>Note</span></Link></div></Card>}
    <Card>{entries.length?<div className="v4-journal">{entries.map(entry=><article className="v4-journal-entry" key={entry.id}><span className="v4-journal-icon"><Icon name={entry.icon}/></span><div><div className="v4-journal-meta"><time>{new Intl.DateTimeFormat("fr-FR",{hour:"2-digit",minute:"2-digit"}).format(new Date(entry.at))}</time>{entry.kind==="handover"&&<StatusBadge tone="brand">Relais</StatusBadge>}{entry.child&&<StatusBadge>{entry.child}</StatusBadge>}</div><h3>{entry.title}</h3><strong>{entry.body}</strong>{entry.comment&&<p>{entry.comment}</p>}<div className="v4-journal-meta v4-journal-author"><Avatar name={entry.author} size="sm"/><span>{entry.author}</span></div></div></article>)}</div>:<EmptyState title="Le journal est encore vide" description="Les moments importants de la journée apparaîtront ici." icon="journal"/>}</Card>
    {compose==="journal"&&<NoteSheet spaceId={spaceId} date={selectedDate} children={snapshot.children} q={q}/>} 
  </div>;
}
