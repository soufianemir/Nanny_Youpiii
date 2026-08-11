import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import type { children as childrenTable, members as membersTable, programItems as programItemsTable } from "@/db/schema";
import { db } from "@/db";
import * as s from "@/db/schema";
import { addActivityAction, deleteActivityAction, saveActivityLibraryAction, updateActivityAction } from "@/app/actions/activity";
import { ACTIVITY_LIBRARY_ROUTINE_NAME, DEFAULT_ACTIVITY_PRESETS, MAX_ACTIVITY_PRESETS } from "@/lib/activity";
import { Icon } from "@/components/ui/icons";
import { ActivityComposerFields } from "@/components/app/activity-composer-fields";

type Child=typeof childrenTable.$inferSelect;
type Member=typeof membersTable.$inferSelect;
type ProgramItem=typeof programItemsTable.$inferSelect;
type ActivityPreset={name:string;childIds:string[]};

function presetScope(description:string|null){
  if(!description)return [];
  try{const parsed=JSON.parse(description) as {childIds?:unknown};return Array.isArray(parsed.childIds)?parsed.childIds.filter((id):id is string=>typeof id==="string"):[];}catch{return [];}
}
async function activityPresets(spaceId:string):Promise<ActivityPreset[]>{
  const [library]=await db.select({id:s.routines.id}).from(s.routines).where(and(eq(s.routines.careSpaceId,spaceId),eq(s.routines.name,ACTIVITY_LIBRARY_ROUTINE_NAME))).limit(1);
  if(!library)return DEFAULT_ACTIVITY_PRESETS.map(name=>({name,childIds:[]}));
  const items=await db.select({title:s.routineItems.title,description:s.routineItems.description}).from(s.routineItems).where(eq(s.routineItems.routineId,library.id)).orderBy(asc(s.routineItems.position));
  const presets=items.map(item=>({name:item.title.trim(),childIds:presetScope(item.description)})).filter(item=>Boolean(item.name)).slice(0,MAX_ACTIVITY_PRESETS);
  return presets.length?presets:DEFAULT_ACTIVITY_PRESETS.map(name=>({name,childIds:[]}));
}

export async function ActivitySheet({spaceId,selectedDate,children,caregivers,memberName,parent,closeHref,item,childIds=[],memberIds=[]}:{spaceId:string;selectedDate:string;children:Child[];caregivers:Member[];memberName:(member:Member)=>string;parent:boolean;closeHref:string;item?:ProgramItem;childIds?:string[];memberIds?:string[]}){
  const presets=await activityPresets(spaceId);const editing=Boolean(item),done=item?.status==="DONE",scheduledMode=editing||parent,action=editing?updateActivityAction:addActivityAction;
  const currentPreset=item?.title?presets.find(preset=>preset.name.toLocaleLowerCase("fr-FR")===item.title.toLocaleLowerCase("fr-FR")):undefined;
  const initialChoice=currentPreset?`PRESET::${currentPreset.name}`:item?.title?`CURRENT::${item.title}`:`PRESET::${presets[0].name}`;
  const slots=[...presets,...Array.from({length:Math.max(0,MAX_ACTIVITY_PRESETS-presets.length)},()=>({name:"",childIds:[]}))].slice(0,MAX_ACTIVITY_PRESETS);
  return <div className="v4-compose-sheet"><Link className="v4-sheet-backdrop" href={closeHref} aria-label="Fermer"/><section className="v4-bottom-sheet v4-activity-sheet v51-activity-sheet v52-activity-sheet" role="dialog" aria-modal="true"><div className="v4-sheet-handle"/><div className="v4-sheet-heading v52-sheet-heading"><div><span className="v4-eyebrow">Activité</span><h2>{editing?"Modifier":"Ajouter"}</h2><p className="v4-form-help">{parent?"Planifiez un repère clair pour la journée.":"Ajoutez seulement ce qui mérite d’être transmis aux parents."}</p></div><Link href={closeHref} className="v4-icon-button" aria-label="Fermer"><Icon name="close"/></Link></div>
    <form className="v4-form v52-form" action={action}><input type="hidden" name="spaceId" value={spaceId}/><input type="hidden" name="returnTo" value={closeHref}/>{item&&<input type="hidden" name="itemId" value={item.id}/>}<ActivityComposerFields presets={presets} children={children.map(child=>({id:child.id,firstName:child.firstName}))} initialChoice={initialChoice} initialChildIds={childIds} editing={editing}/>
      {done?<div className="v5-history-lock"><Icon name="check"/><span><strong>Activité déjà réalisée</strong><small>Le contenu peut être corrigé, mais l’historique de réalisation reste conservé.</small></span><input type="hidden" name="timing" value="SCHEDULED"/><input type="hidden" name="date" value={item?.programDate||selectedDate}/><input type="hidden" name="time" value={item?.plannedStart||""}/><input type="hidden" name="end" value={item?.plannedEnd||""}/></div>:scheduledMode?<section className="v52-schedule-section"><input type="hidden" name="timing" value="SCHEDULED"/><div className="v52-section-heading"><span>Quand ?</span><small>{parent?"Planifié à l’avance":"Horaire prévu"}</small></div><div className="v52-schedule-card"><label><span>Date</span><input name="date" type="date" defaultValue={item?.programDate||selectedDate} required/></label><i/><label><span>Heure</span><input name="time" type="time" defaultValue={item?.plannedStart||""} required/></label></div></section>:<div className="v52-now-auto"><input type="hidden" name="timing" value="NOW"/><span className="v52-live-dot"/><span><strong>Ajoutée maintenant</strong><small>La date et l’heure seront enregistrées automatiquement.</small></span></div>}
      <div className="v4-field v52-details"><label>Détails <small>(facultatif)</small></label><textarea name="description" rows={4} defaultValue={item?.description||""} placeholder={'Ex. pour un repas :\nBrocolis\nPoulet\nYaourt'}/></div>
      {parent&&caregivers.length>0&&<details className="v4-more-options v52-more-options"><summary>Plus d’options</summary><div className="v4-form"><div className="v4-field"><label>Qui s’en occupe ?</label><div className="v52-caregiver-grid">{caregivers.map(member=><label className="v52-caregiver-choice" key={member.id}><input type="checkbox" name="memberIds" value={member.id} defaultChecked={memberIds.includes(member.id)||(!editing&&caregivers.length===1)}/><span>{memberName(member)}<i><Icon name="check" size={13}/></i></span></label>)}</div></div>{!done&&<div className="v4-field"><label>Heure de fin</label><input className="v52-simple-input" name="end" type="time" defaultValue={item?.plannedEnd||""}/></div>}</div></details>}
      <button className="btn brandbtn full v52-primary-cta">{editing?"Enregistrer":parent?"Ajouter au planning":"Ajouter comme fait"}</button></form>
    {parent&&<details className="v51-library-settings v52-library-settings"><summary><span><Icon name="settings" size={18}/><span><strong>Personnaliser les activités</strong><small>Gardez seulement les rubriques utiles à votre famille.</small></span></span><Icon name="chevronRight" size={17}/></summary><form action={saveActivityLibraryAction} className="v51-library-form"><input type="hidden" name="spaceId" value={spaceId}/><div className="v51-library-note"><strong>Jusqu’à {MAX_ACTIVITY_PRESETS} activités régulières</strong><small>Renommez une ligne ou laissez-la vide pour la retirer. “Autre” reste toujours disponible.</small></div><div className="v51-library-list">{slots.map((preset,index)=><div className="v51-library-row" key={index}><span className="v51-library-index">{index+1}</span><div className="v51-library-copy"><input name={`name-${index}`} defaultValue={preset.name} maxLength={60} placeholder={index<4?`Activité ${index+1}`:"Facultatif"}/>{children.length>1&&<div className="v51-library-scope"><small>Pour qui ? <b>aucun choix = tous</b></small><div className="v52-library-child-grid">{children.map(child=><label className="v52-mini-choice" key={child.id}><input type="checkbox" name={`preset-child-${index}`} value={child.id} defaultChecked={preset.childIds.includes(child.id)}/><span>{child.firstName}</span></label>)}</div></div>}</div></div>)}</div><button className="btn primary full" type="submit">Enregistrer ma liste</button></form></details>}
    {item&&<form action={deleteActivityAction} className="v4-activity-delete"><input type="hidden" name="spaceId" value={spaceId}/><input type="hidden" name="itemId" value={item.id}/><input type="hidden" name="returnTo" value={closeHref}/><button className="btn soft full" type="submit">Supprimer cette activité</button></form>}
  </section></div>;
}
