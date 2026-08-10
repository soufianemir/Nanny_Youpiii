import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

export function Avatar({name,size="md"}:{name:string;size?:"sm"|"md"|"lg"}){
  const initials=name.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join("")||"?";
  return <span className={`v4-avatar v4-avatar-${size}`} aria-label={name}>{initials}</span>;
}

export function Card({children,className="",tone="default"}:{children:ReactNode;className?:string;tone?:"default"|"soft"|"brand"|"dark"}){
  return <section className={`v4-card v4-card-${tone} ${className}`.trim()}>{children}</section>;
}

export function SectionHeader({title,eyebrow,action}:{title:string;eyebrow?:string;action?:ReactNode}){
  return <div className="v4-section-header"><div>{eyebrow&&<span className="v4-eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{action}</div>;
}

export function StatusBadge({children,tone="neutral"}:{children:ReactNode;tone?:"neutral"|"success"|"warning"|"danger"|"brand"}){
  return <span className={`v4-badge v4-badge-${tone}`}>{children}</span>;
}

export function IconButton({href,label,icon}:{href:string;label:string;icon:IconName}){
  return <Link className="v4-icon-button" href={href} aria-label={label}><Icon name={icon}/></Link>;
}

export function EmptyState({title,description,icon="sun"}:{title:string;description?:string;icon?:IconName}){
  return <div className="v4-empty"><span className="v4-empty-icon"><Icon name={icon} size={24}/></span><strong>{title}</strong>{description&&<p>{description}</p>}</div>;
}

export function ListRow({icon,title,subtitle,trailing,href}:{icon?:IconName;title:string;subtitle?:string;trailing?:ReactNode;href?:string}){
  const body=<>{icon&&<span className="v4-row-icon"><Icon name={icon}/></span>}<span className="v4-row-copy"><strong>{title}</strong>{subtitle&&<small>{subtitle}</small>}</span>{trailing&&<span className="v4-row-trailing">{trailing}</span>}</>;
  return href?<Link href={href} className="v4-list-row">{body}</Link>:<div className="v4-list-row">{body}</div>;
}

export function ChildChip({name}:{name:string}){return <span className="v4-person-chip"><Avatar name={name} size="sm"/><span>{name}</span></span>}
export function CaregiverChip({name,label}:{name:string;label?:string}){return <span className="v4-person-chip"><Avatar name={name} size="sm"/><span>{name}{label?` · ${label}`:""}</span></span>}

export function PageTitle({eyebrow,title,description,action}:{eyebrow?:string;title:string;description?:string;action?:ReactNode}){
  return <div className="v4-page-title"><div>{eyebrow&&<span className="v4-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>{action}</div>;
}
