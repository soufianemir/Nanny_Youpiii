import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

export type NavigationItem={id:string;label:string;icon:IconName;href:string};

export function AppHeader({spaceName,context,action,homeHref}:{spaceName:string;context?:string;action?:ReactNode;homeHref?:string}){
  const brand=<><span className="v4-logo">Y</span><span className="v4-brand-copy"><strong>Nanny Youpiii</strong><small>{context||spaceName}</small></span></>;
  return <header className="v4-app-header"><div className="v4-app-header-inner">{homeHref?<Link href={homeHref} className="v4-brand" aria-label="Nanny Youpiii — Aujourd’hui">{brand}</Link>:<div className="v4-brand" aria-label="Nanny Youpiii">{brand}</div>}{action&&<div className="v4-header-action">{action}</div>}</div></header>;
}

export function BottomNavigation({items,activeId}:{items:NavigationItem[];activeId:string}){
  return <nav className="v4-bottom-nav" aria-label="Navigation principale"><div className="v4-bottom-nav-inner">{items.slice(0,4).map(item=><Link key={item.id} href={item.href} className={activeId===item.id?"is-active":""} aria-current={activeId===item.id?"page":undefined}><Icon name={item.icon} size={21}/><span>{item.label}</span></Link>)}</div></nav>;
}

export function AppShell({header,navigation,floatingAction,children}:{header:ReactNode;navigation:ReactNode;floatingAction?:ReactNode;children:ReactNode}){
  return <div className="v4-shell">{header}<main className="v4-main">{children}</main>{floatingAction}{navigation}</div>;
}
