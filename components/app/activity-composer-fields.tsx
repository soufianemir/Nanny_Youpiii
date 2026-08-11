"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";

type Preset={name:string;childIds:string[]};
type Child={id:string;firstName:string};
const MOMENT_VALUE="CURRENT::Moment / humeur";

function presetChildren(value:string,presets:Preset[],children:Child[]){
  if(!value.startsWith("PRESET::"))return null;
  const name=value.slice("PRESET::".length);
  const preset=presets.find(item=>item.name===name);
  if(!preset)return null;
  return preset.childIds.length?preset.childIds:children.map(child=>child.id);
}

export function ActivityComposerFields({presets,children,initialChoice,initialChildIds,editing}:{presets:Preset[];children:Child[];initialChoice:string;initialChildIds:string[];editing:boolean}){
  const [choice,setChoice]=useState(initialChoice);
  const [selectedChildren,setSelectedChildren]=useState<string[]>(()=>{
    if(initialChildIds.length)return initialChildIds;
    if(editing)return [];
    return presetChildren(initialChoice,presets,children)??(children.length===1?[children[0].id]:[]);
  });
  const isOther=choice==="OTHER";
  function changeChoice(value:string){setChoice(value);const scoped=presetChildren(value,presets,children);if(scoped)setSelectedChildren(scoped);else if(children.length===1)setSelectedChildren([children[0].id]);}
  function toggleChild(id:string,checked:boolean){setSelectedChildren(current=>checked?[...new Set([...current,id])]:current.filter(value=>value!==id));}
  return <>
    <fieldset className="v4-activity-fieldset v52-activity-picker">
      <div className="v52-section-heading"><span>Activité</span></div>
      <label className="v52-select-shell">
        <select name="activityType" value={choice} onChange={event=>changeChoice(event.target.value)} aria-label="Choisir une activité">
          <optgroup label="Activités de la famille">{presets.map(preset=><option value={`PRESET::${preset.name}`} key={preset.name}>{preset.name}</option>)}</optgroup>
          {!presets.some(preset=>preset.name.toLocaleLowerCase("fr-FR").includes("humeur"))&&<optgroup label="Transmission rapide"><option value={MOMENT_VALUE}>Moment / humeur</option></optgroup>}
          {choice.startsWith("CURRENT::")&&choice!==MOMENT_VALUE&&<optgroup label="Activité actuelle"><option value={choice}>{choice.slice("CURRENT::".length)}</option></optgroup>}
          <option value="OTHER">Autre…</option>
        </select>
        <span className="v52-select-chevron" aria-hidden="true"><Icon name="chevronRight" size={18}/></span>
      </label>
      {isOther&&<div className="v52-custom-activity"><label htmlFor="custom-activity-name">Nom de l’activité</label><input id="custom-activity-name" name="customTitle" maxLength={80} autoFocus required placeholder="Ex. Escalade, pique-nique…"/><small>Cette activité reste ponctuelle et ne sera pas ajoutée à votre liste.</small></div>}
    </fieldset>
    {children.length===1&&<div className="v52-child-single"><input type="hidden" name="childIds" value={children[0].id}/><span className="v52-child-avatar">{children[0].firstName.slice(0,1).toUpperCase()}</span><span><small>Pour</small><strong>{children[0].firstName}</strong></span><span className="v52-selected-check"><Icon name="check" size={16}/></span></div>}
    {children.length>1&&<fieldset className="v4-activity-fieldset v52-children-field"><div className="v52-section-heading"><span>Pour qui ?</span><small>Sélection automatique selon votre rubrique</small></div><div className="v52-child-grid">{children.map(child=><label className="v52-child-choice" key={child.id}><input type="checkbox" name="childIds" value={child.id} checked={selectedChildren.includes(child.id)} onChange={event=>toggleChild(child.id,event.target.checked)}/><span><b>{child.firstName.slice(0,1).toUpperCase()}</b>{child.firstName}<i><Icon name="check" size={13}/></i></span></label>)}</div></fieldset>}
  </>;
}
