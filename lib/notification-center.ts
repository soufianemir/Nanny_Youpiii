export function notificationDestination(type:string,careSpaceId:string){
  const base=`/app?space=${encodeURIComponent(careSpaceId)}`;
  if(type==="MESSAGE")return `${base}&section=more&area=messages`;
  if(type.startsWith("PLANNING_UPDATED:")){const date=type.slice("PLANNING_UPDATED:".length);return `${base}&section=planning${/^\d{4}-\d{2}-\d{2}$/.test(date)?`&date=${date}`:""}`;}
  if(type==="SHIFT_ENDED"||type==="ACTIVITY_DONE"||type==="SHIFT_STARTED")return `${base}&section=today`;
  return `${base}&section=today`;
}

export function notificationCategory(type:string){
  if(type==="MESSAGE")return "message";
  if(type==="SHIFT_ENDED")return "handover";
  if(type==="ACTIVITY_DONE"||type.startsWith("PLANNING_UPDATED:"))return "activity";
  if(type==="SHIFT_STARTED")return "shift";
  return "general";
}
