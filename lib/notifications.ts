import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { sendWebPush } from "@/lib/push";

type NotificationKind="activities"|"messages"|"handovers";
export async function notifySpaceUsers(args:{spaceId:string;excludeUserId?:string;kind:NotificationKind;type:string;title:string;body?:string;url?:string;childIds?:string[]}){
  let memberships=await db.select().from(s.members).where(and(eq(s.members.careSpaceId,args.spaceId),eq(s.members.status,"ACTIVE"),...(args.excludeUserId?[ne(s.members.userId,args.excludeUserId)]:[])));
  const childIds=[...new Set((args.childIds||[]).filter(Boolean))];
  if(childIds.length&&memberships.length){const links=await db.select().from(s.memberChildren).where(inArray(s.memberChildren.memberId,memberships.map(member=>member.id)));memberships=memberships.filter(member=>childIds.every(childId=>links.some(link=>link.memberId===member.id&&link.childId===childId)));}
  const userIds=[...new Set(memberships.map(item=>item.userId))];if(!userIds.length)return;
  const prefs=await db.select().from(s.notificationPreferences).where(inArray(s.notificationPreferences.userId,userIds));const allowed=userIds.filter(userId=>{const pref=prefs.find(item=>item.userId===userId);return pref?pref[args.kind]!==false:true;});if(!allowed.length)return;
  await db.insert(s.notifications).values(allowed.map(userId=>({userId,careSpaceId:args.spaceId,type:args.type,title:args.title,body:args.body||null})));await sendWebPush(allowed,{title:args.title,body:args.body,url:args.url||`/app?space=${args.spaceId}`,tag:`${args.type}-${args.spaceId}`});
}
export async function trackProductEvent(name:string,userId?:string|null,careSpaceId?:string|null,metadata:Record<string,unknown>={}){try{await db.insert(s.productEvents).values({name,userId:userId||null,careSpaceId:careSpaceId||null,metadata});}catch(error){console.error("PRODUCT_EVENT_FAILED",name,error);}}
