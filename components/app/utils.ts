export const today=(timeZone="Europe/Paris")=>{
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const get=(type:Intl.DateTimeFormatPartTypes)=>parts.find(p=>p.type===type)?.value||"";
  return `${get("year")}-${get("month")}-${get("day")}`;
};
export const money=(n:unknown)=>`${Number(n||0).toFixed(2).replace('.',',')} €`;
export const roleLabel=(r:string)=>({PARENT_ADMIN:'Parent admin',PARENT:'Parent',NANNY:'Nounou',BABYSITTER:'Baby-sitter',CAREGIVER:'Intervenant'}[r]||r);
export const dateLabel=(d:string)=>new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${d}T12:00:00`));
