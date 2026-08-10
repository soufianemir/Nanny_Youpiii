"use client";

import { useState } from "react";
import { addShiftAction, removePlannedShiftAction, saveCarePeriodAction, updatePlannedShiftAction } from "@/app/actions/schedule";
import { schoolYearPeriod } from "@/lib/care-schedule";
import { Icon } from "@/components/ui/icons";

export type CareDayInput={weekday:number;label:string;active:boolean;start:string;end:string};
export type CareException={id:string;date:string;start:string;end:string};

export function CareScheduleEditor({
  spaceId,
  memberId,
  selectedDate,
  periodStart,
  periodEnd,
  initialDays,
  exceptions,
  defaultOpen=false,
}:{
  spaceId:string;
  memberId:string;
  selectedDate:string;
  periodStart:string;
  periodEnd:string;
  initialDays:CareDayInput[];
  exceptions:CareException[];
  defaultOpen?:boolean;
}){
  const [start,setStart]=useState(periodStart);
  const [end,setEnd]=useState(periodEnd);
  const [days,setDays]=useState(initialDays);
  const schoolYear=schoolYearPeriod(selectedDate);
  const schoolLabel=`Année scolaire ${schoolYear.start.slice(0,4)}–${schoolYear.end.slice(0,4)}`;

  const updateDay=(weekday:number,patch:Partial<CareDayInput>)=>{
    setDays(values=>values.map(day=>day.weekday===weekday?{...day,...patch}:day));
  };

  return <div className="v4-care-editor">
    <form action={saveCarePeriodAction} className="v4-form">
      <input type="hidden" name="spaceId" value={spaceId}/>
      <input type="hidden" name="memberId" value={memberId}/>
      <div className="v4-care-period">
        <div className="v4-field"><label>Du</label><input name="periodStart" type="date" value={start} onChange={event=>setStart(event.target.value)} required/></div>
        <div className="v4-field"><label>Au</label><input name="periodEnd" type="date" value={end} onChange={event=>setEnd(event.target.value)} required/></div>
        <button type="button" className="btn soft" onClick={()=>{setStart(schoolYear.start);setEnd(schoolYear.end)}}><Icon name="calendar"/> {schoolLabel}</button>
      </div>
      <div className="v4-care-week">
        {days.map(day=><div className={`v4-care-day ${day.active?"is-active":"is-off"}`} key={day.weekday}>
          <label className="v4-care-day-toggle">
            <input type="checkbox" name={`day-${day.weekday}`} checked={day.active} onChange={event=>updateDay(day.weekday,{active:event.target.checked})}/>
            <strong>{day.label}</strong>
          </label>
          <input aria-label={`Début ${day.label}`} name={`start-${day.weekday}`} type="time" value={day.start} disabled={!day.active} onChange={event=>updateDay(day.weekday,{start:event.target.value})}/>
          <span>→</span>
          <input aria-label={`Fin ${day.label}`} name={`end-${day.weekday}`} type="time" value={day.end} disabled={!day.active} onChange={event=>updateDay(day.weekday,{end:event.target.value})}/>
        </div>)}
      </div>
      <p className="v4-form-help">Cochez uniquement les jours de garde. Un seul enregistrement applique tout le planning sur la période choisie.</p>
      <button className="btn brandbtn full"><Icon name="check"/> Enregistrer les horaires</button>
    </form>

    <details className="v4-care-exceptions" open={defaultOpen}>
      <summary><span><Icon name="plus"/> Garde ponctuelle ou exception</span><Icon name="chevronRight" size={17}/></summary>
      <div className="v4-care-exception-body">
        <p className="v4-form-help">Pour ajouter un jour isolé ou changer les horaires d’une seule date. Cette garde remplace automatiquement l’horaire régulier du jour.</p>
        <form action={addShiftAction} className="v4-care-exception-new">
          <input type="hidden" name="spaceId" value={spaceId}/>
          <input type="hidden" name="memberId" value={memberId}/>
          <input aria-label="Date de la garde" name="date" type="date" defaultValue={selectedDate} required/>
          <input aria-label="Heure de début" name="start" type="time" defaultValue="16:00" required/>
          <span>→</span>
          <input aria-label="Heure de fin" name="end" type="time" defaultValue="18:30" required/>
          <button className="btn soft"><Icon name="plus"/> Ajouter</button>
        </form>
        {exceptions.length>0&&<div className="v4-care-exception-list">
          <strong className="v4-care-exception-title">Gardes ponctuelles prévues</strong>
          {exceptions.map(exception=><div className="v4-care-exception-row" key={exception.id}>
            <form action={updatePlannedShiftAction} className="v4-care-exception-edit">
              <input type="hidden" name="spaceId" value={spaceId}/>
              <input type="hidden" name="memberId" value={memberId}/>
              <input type="hidden" name="shiftId" value={exception.id}/>
              <input name="date" type="date" defaultValue={exception.date} aria-label="Date"/>
              <input name="start" type="time" defaultValue={exception.start} aria-label="Début"/>
              <span>→</span>
              <input name="end" type="time" defaultValue={exception.end} aria-label="Fin"/>
              <button className="v4-icon-button" aria-label="Enregistrer la modification"><Icon name="check"/></button>
            </form>
            <form action={removePlannedShiftAction}>
              <input type="hidden" name="spaceId" value={spaceId}/>
              <input type="hidden" name="shiftId" value={exception.id}/>
              <button className="v4-icon-button" aria-label="Supprimer cette garde"><Icon name="close"/></button>
            </form>
          </div>)}
        </div>}
      </div>
    </details>
  </div>;
}
