export const today=()=>new Date().toISOString().slice(0,10);
export const money=(n:unknown)=>`${Number(n||0).toFixed(2).replace('.',',')} €`;
export const roleLabel=(r:string)=>({PARENT_ADMIN:'Parent admin',PARENT:'Parent',NANNY:'Nounou',BABYSITTER:'Baby-sitter',CAREGIVER:'Intervenant'}[r]||r);
export const dateLabel=(d:string)=>new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${d}T12:00:00`));
