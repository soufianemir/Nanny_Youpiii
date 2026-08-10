import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

export type NavigationItem={id:string;label:string;icon:IconName;href:string};
export type SpaceOption={id:string;name:string;href:string;active:boolean;roleLabel?:string};

export function AppHeader({spaceName,context,action,homeHref,spaces=[]}:{spaceName:string;context?:string;action?:ReactNode;homeHref?:string;spaces?:SpaceOption[]}){
  const brand=<><span className="v4-logo">Y</span><span className="v4-brand-copy"><strong>Nanny Youpiii</strong><small>{context||spaceName}</small></span></>;
  return <header className="v4-app-header"><div className="v4-app-header-inner"><div className="v5-header-left">{homeHref?<Link href={homeHref} className="v4-brand" aria-label="Nanny Youpiii — Aujourd’hui">{brand}</Link>:<div className="v4-brand" aria-label="Nanny Youpiii">{brand}</div>}{spaces.length>1&&<details className="v5-space-switcher"><summary aria-label="Changer de famille"><Icon name="chevronRight" size={16}/></summary><div className="v5-space-menu"><span className="v4-eyebrow">Mes familles</span>{spaces.map(space=><Link key={space.id} href={space.href} className={space.active?"is-active":""}><span><strong>{space.name}</strong>{space.roleLabel&&<small>{space.roleLabel}</small>}</span>{space.active&&<Icon name="check" size={16}/>}</Link>)}</div></details>}</div>{action&&<div className="v4-header-action">{action}</div>}</div></header>;
}

export function BottomNavigation({items,activeId}:{items:NavigationItem[];activeId:string}){return <nav className="v4-bottom-nav" aria-label="Navigation principale"><div className="v4-bottom-nav-inner">{items.slice(0,4).map(item=><Link key={item.id} href={item.href} className={activeId===item.id?"is-active":""} aria-current={activeId===item.id?"page":undefined}><Icon name={item.icon} size={21}/><span>{item.label}</span></Link>)}</div></nav>}
export function AppShell({header,navigation,floatingAction,children}:{header:ReactNode;navigation:ReactNode;floatingAction?:ReactNode;children:ReactNode}){return <div className="v4-shell">{header}<main className="v4-main">{children}</main>{floatingAction}{navigation}</div>}
