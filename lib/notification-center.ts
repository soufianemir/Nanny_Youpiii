export function notificationDestination(type:string,careSpaceId:string){
  const base=`/app?space=${encodeURIComponent(careSpaceId)}`;
  if(type==="MESSAGE")return `${base}&section=more&area=messages`;
  if(type==="SHIFT_ENDED")return `${base}&section=more&area=history`;
  if(type==="ACTIVITY_DONE"||type==="SHIFT_STARTED")return `${base}&section=today`;
  return `${base}&section=today`;
}

export function notificationCategory(type:string){
  if(type==="MESSAGE")return "message";
  if(type==="SHIFT_ENDED")return "handover";
  if(type==="ACTIVITY_DONE")return "activity";
  if(type==="SHIFT_STARTED")return "shift";
  return "general";
}
