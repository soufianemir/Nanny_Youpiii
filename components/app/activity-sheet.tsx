import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import type { children as childrenTable, members as membersTable, programItems as programItemsTable } from "@/db/schema";
import { db } from "@/db";
import * as s from "@/db/schema";
import { addActivityAction, deleteActivityAction, updateActivityAction } from "@/app/actions/activity";
import { activityKeyFromStored, activityTypes } from "@/lib/activity";
import { Icon } from "@/components/ui/icons";

type Child=typeof childrenTable.$inferSelect;
type Member=typeof membersTable.$inferSelect;
type ProgramItem=typeof programItemsTable.$inferSelect;

function customActivityNames(items:Array<{title:string;type:string}>){
  const builtIns=new Set(activityTypes.map(item=>item.label.toLocaleLowerCase("fr-FR")));
  const seen=new Set<string>();
  const result:string[]=[];
  for(const item of items){
    const title=item.title.trim();
    if(!title||builtIns.has(title.toLocaleLowerCase("fr-FR")))continue;
    const isCustom=item.type==="Autre"||activityKeyFromStored(item.type,item.title)==="OTHER";
    if(!isCustom)continue;
    const key=title.toLocaleLowerCase("fr-FR");
    if(seen.has(key))continue;
    seen.add(key);result.push(title);
    if(result.length>=24)break;
  }
  return result;
}

export async function ActivitySheet({spaceId,selectedDate,children,caregivers,memberName,parent,closeHref,item,childIds=[],memberIds=[]}:{spaceId:string;selectedDate:string;children:Child[];caregivers:Member[];memberName:(member:Member)=>string;parent:boolean;closeHref:string;item?:ProgramItem;childIds?:string[];memberIds?:string[]}){
  const editing=Boolean(item),done=item?.status==="DONE",initialType=activityKeyFromStored(item?.type,item?.title),scheduled=editing,action=editing?updateActivityAction:addActivityAction;
  const recent=await db.select({title:s.programItems.title,type:s.programItems.type}).from(s.programItems).where(eq(s.programItems.careSpaceId,spaceId)).orderBy(desc(s.programItems.programDate)).limit(180);
  const customActivities=customActivityNames(recent);
  if(editing&&initialType==="OTHER"&&item?.title&&!customActivities.some(name=>name.toLocaleLowerCase("fr-FR")===item.title.toLocaleLowerCase("fr-FR")))customActivities.unshift(item.title);
  const initialChoice=editing?(initialType==="OTHER"&&item?.title?`CUSTOM::${item.title}`:initialType):"MEAL";
  return <div className="v4-compose-sheet"><Link className="v4-sheet-backdrop" href={closeHref} aria-label="Fermer"/><section className="v4-bottom-sheet v4-activity-sheet v51-activity-sheet" role="dialog" aria-modal="true"><div className="v4-sheet-handle"/><div className="v4-sheet-heading"><div><span className="v4-eyebrow">Activité</span><h2>{editing?"Modifier":"Ajouter"}</h2><p className="v4-form-help">Un repère simple pour la journée. Rien n’est considéré comme fait avant confirmation.</p></div><Link href={closeHref} className="v4-icon-button" aria-label="Fermer"><Icon name="close"/></Link></div>
    <form className="v4-form" action={action}><input type="hidden" name="spaceId" value={spaceId}/><input type="hidden" name="returnTo" value={closeHref}/>{item&&<input type="hidden" name="itemId" value={item.id}/>}<fieldset className="v4-activity-fieldset v51-activity-picker"><legend>Activité</legend><label className="v51-select-wrap"><span className="v51-select-icon"><Icon name="activity" size={19}/></span><select name="activityType" defaultValue={initialChoice} aria-label="Choisir une activité">{activityTypes.filter(type=>type.key!=="OTHER").map(type=><option value={type.key} key={type.key}>{type.label}</option>)}{customActivities.length>0&&<optgroup label="Mes activités">{customActivities.map(name=><option value={`CUSTOM::${name}`} key={name}>★ {name}</option>)}</optgroup>}<option value="OTHER">＋ Nouvelle activité…</option></select><span className="v51-select-chevron"><Icon name="chevronRight" size={17}/></span></label><div className="v51-new-activity"><label htmlFor="custom-activity-name">Ou créez une nouvelle activité</label><input id="custom-activity-name" name="customTitle" maxLength={80} placeholder="Piano, escalade, orthophoniste…"/><small>{parent?"Si vous écrivez un nom ici, il sera proposé automatiquement dans ce menu la prochaine fois.":"Pour ajouter ce que vous avez réellement fait en plus."}</small></div></fieldset>
      {done?<div className="v5-history-lock"><Icon name="check"/><span><strong>Activité déjà réalisée</strong><small>Vous pouvez corriger le contenu ou l’attribution. L’historique de réalisation reste conservé.</small></span><input type="hidden" name="timing" value="SCHEDULED"/><input type="hidden" name="date" value={item?.programDate||selectedDate}/><input type="hidden" name="time" value={item?.plannedStart||""}/><input type="hidden" name="end" value={item?.plannedEnd||""}/></div>:<fieldset className="v4-activity-fieldset"><legend>Quand ?</legend><div className="v4-activity-timing"><label><input type="radio" name="timing" value="NOW" defaultChecked={!scheduled}/><span>Maintenant</span></label><label><input type="radio" name="timing" value="SCHEDULED" defaultChecked={scheduled}/><span>Choisir</span></label></div><div className="v4-activity-scheduled"><div className="v4-form-row"><div className="v4-field"><label>Date</label><input name="date" type="date" defaultValue={item?.programDate||selectedDate}/></div><div className="v4-field"><label>Heure</label><input name="time" type="time" defaultValue={item?.plannedStart||""}/></div></div></div></fieldset>}
      {children.length>0&&<fieldset className="v4-activity-fieldset"><legend>Pour qui ?</legend><div className="v4-activity-people">{children.map(child=><label key={child.id}><input type="checkbox" name="childIds" value={child.id} defaultChecked={childIds.includes(child.id)||(!editing&&children.length===1)}/><span>{child.firstName}</span></label>)}</div></fieldset>}
      <div className="v4-field"><label>Détails <small>(facultatif)</small></label><textarea name="description" rows={4} defaultValue={item?.description||""} placeholder={'Ex. pour un repas :\nBrocolis\nPoulet\nYaourt'}/></div>
      {parent&&caregivers.length>0&&<details className="v4-more-options"><summary>Plus d’options</summary><div className="v4-form"><div className="v4-field"><label>Qui s’en occupe ?</label><div className="v4-activity-people">{caregivers.map(member=><label key={member.id}><input type="checkbox" name="memberIds" value={member.id} defaultChecked={memberIds.includes(member.id)||(!editing&&caregivers.length===1)}/><span>{memberName(member)}</span></label>)}</div></div>{!done&&<div className="v4-field"><label>Heure de fin</label><input name="end" type="time" defaultValue={item?.plannedEnd||""}/></div>}</div></details>}
      <button className="btn brandbtn full">{editing?"Enregistrer":"Ajouter au planning"}</button></form>{item&&<form action={deleteActivityAction} className="v4-activity-delete"><input type="hidden" name="spaceId" value={spaceId}/><input type="hidden" name="itemId" value={item.id}/><input type="hidden" name="returnTo" value={closeHref}/><button className="btn soft full" type="submit">Supprimer cette activité</button></form>}
  </section></div>;
}
