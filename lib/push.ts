import crypto from "node:crypto";
import { inArray } from "drizzle-orm";
import * as webpush from "web-push";
import { db } from "@/db";
import * as s from "@/db/schema";
import { appBaseUrl, neonAuthCookieSecret } from "@/lib/env";

function base64Url(buffer:Buffer){return buffer.toString("base64url");}

function vapidKeys(){
  const ecdh=crypto.createECDH("prime256v1");
  let candidate=crypto.createHash("sha256").update(`nanny-youpiii:v5:web-push:${neonAuthCookieSecret()}`).digest();
  for(let i=0;i<8;i++){
    try{ecdh.setPrivateKey(candidate);break;}catch{candidate=crypto.createHash("sha256").update(candidate).digest();}
  }
  const privateKey=base64Url(ecdh.getPrivateKey());
  const publicKey=base64Url(ecdh.getPublicKey(undefined,"uncompressed"));
  return {privateKey,publicKey};
}

export function webPushPublicKey(){return vapidKeys().publicKey;}

export async function sendWebPush(userIds:string[],payload:{title:string;body?:string;url?:string;tag?:string}){
  const ids=[...new Set(userIds.filter(Boolean))];
  if(!ids.length)return;
  const keys=vapidKeys();
  webpush.setVapidDetails(appBaseUrl(),keys.publicKey,keys.privateKey);
  const subscriptions=await db.select().from(s.pushSubscriptions).where(inArray(s.pushSubscriptions.userId,ids));
  await Promise.all(subscriptions.map(async subscription=>{
    try{
      await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},JSON.stringify(payload),{TTL:60*60});
    }catch(error:any){
      if(error?.statusCode===404||error?.statusCode===410)await db.delete(s.pushSubscriptions).where(inArray(s.pushSubscriptions.id,[subscription.id]));
      else console.error("WEB_PUSH_FAILED",error?.statusCode||error?.message||error);
    }
  }));
}
