import Link from "next/link";
import { addChildAction } from "@/app/actions/space";
import { Icon } from "@/components/ui/icons";
import { Avatar, Card, EmptyState, PageTitle, StatusBadge } from "@/components/ui/primitives";
import type { children as childrenTable } from "@/db/schema";

type Child=typeof childrenTable.$inferSelect;
type Query=(extra:Record<string,string>)=>string;

function ageLabel(birthDate:string|null){
  if(!birthDate)return "Âge non renseigné";
  const birth=new Date(`${birthDate}T12:00:00`);const now=new Date();let years=now.getFullYear()-birth.getFullYear();if(now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate()))years--;
  return years>=0?`${years} an${years>1?"s":""}`:"Âge non renseigné";
}

function AddChildSheet({spaceId,q}:{spaceId:string;q:Query}){const close=q({section:"more",area:"children",compose:""});return <div className="v4-compose-sheet"><Link className="v4-sheet-backdrop" href={close} aria-label="Fermer"/><section className="v4-bottom-sheet" role="dialog" aria-modal="true"><div className="v4-sheet-handle"/><div className="v4-sheet-heading"><div><span className="v4-eyebrow">Famille</span><h2>Ajouter un enfant</h2></div><Link href={close} className="v4-icon-button" aria-label="Fermer"><Icon name="close"/></Link></div><form className="v4-form" action={addChildAction}><input type="hidden" name="spaceId" value={spaceId}/><div className="v4-field"><label>Prénom</label><input name="firstName" required autoFocus/></div><div className="v4-field"><label>Date de naissance</label><input type="date" name="birthDate"/></div><button className="btn brandbtn full">Ajouter</button></form></section></div>}

export function ChildrenPanel({spaceId,children,canEdit,q,compose}:{spaceId:string;children:Child[];canEdit:boolean;q:Query;compose?:string}){
  return <div className="v4-stack"><PageTitle eyebrow="Famille" title="Enfants" description="Les informations utiles sont regroupées par enfant, sans écran technique." action={canEdit?<Link className="btn brandbtn" href={q({section:"more",area:"children",compose:"child"})}><Icon name="plus"/> Ajouter</Link>:undefined}/>{children.length?<div className="v4-grid-2">{children.map(child=><Card key={child.id}><div className="v4-profile-hero"><Avatar name={child.firstName} size="lg"/><div><h2>{child.firstName}</h2><p>{ageLabel(child.birthDate)}</p></div></div><div className="v4-profile-chips"><StatusBadge tone="brand">Planning</StatusBadge><StatusBadge>Journal</StatusBadge><StatusBadge>Consignes</StatusBadge><StatusBadge>Habitudes</StatusBadge></div><div className="v4-settings-group"><div className="v4-setting-row"><span><strong>Informations utiles</strong><small>{child.notes||"Aucune information particulière renseignée."}</small></span><Icon name="note"/></div><div className="v4-setting-row"><span><strong>Date de naissance</strong><small>{child.birthDate?new Intl.DateTimeFormat("fr-FR",{dateStyle:"long"}).format(new Date(`${child.birthDate}T12:00:00`)):"Non renseignée"}</small></span><Icon name="child"/></div></div></Card>)}</div>:<Card><EmptyState title="Ajoutez votre premier enfant" description="Son planning, ses consignes et son journal seront ensuite visibles au même endroit." icon="child"/></Card>}{compose==="child"&&<AddChildSheet spaceId={spaceId} q={q}/>}</div>;
}
