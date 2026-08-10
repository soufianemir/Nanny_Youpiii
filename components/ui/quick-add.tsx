"use client";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "./icons";

export type QuickAddOption={label:string;description:string;icon:IconName;href:string};

export function QuickAdd({options}:{options:QuickAddOption[]}){
  const [open,setOpen]=useState(false);
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};
    window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);
  },[]);
  if(!options.length)return null;
  if(options.length===1){
    const option=options[0];
    return <a className="v4-fab" href={option.href} aria-label={option.label}><Icon name="plus" size={24}/></a>;
  }
  return <>
    <button className="v4-fab" type="button" aria-label="Ajouter" aria-expanded={open} onClick={()=>setOpen(true)}><Icon name="plus" size={24}/></button>
    {open&&<div className="v4-sheet-layer" role="presentation"><button className="v4-sheet-backdrop" aria-label="Fermer" onClick={()=>setOpen(false)}/><section className="v4-bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="quick-add-title"><div className="v4-sheet-handle"/><div className="v4-sheet-heading"><div><span className="v4-eyebrow">Création rapide</span><h2 id="quick-add-title">Ajouter</h2></div><button className="v4-icon-button" type="button" aria-label="Fermer" onClick={()=>setOpen(false)}><Icon name="close"/></button></div><div className="v4-sheet-menu">{options.map(option=><a key={option.href} href={option.href} className="v4-sheet-menu-item"><span className="v4-sheet-menu-icon"><Icon name={option.icon}/></span><span><strong>{option.label}</strong><small>{option.description}</small></span><Icon name="chevronRight" size={18}/></a>)}</div></section></div>}
  </>;
}
