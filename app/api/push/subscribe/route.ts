import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireUser } from "@/lib/security";

export const dynamic="force-dynamic";

export async function POST(request:NextRequest){
  try{
    const session=await requireUser();
    const body=await request.json();
    const endpoint=String(body?.endpoint||"");
    const p256dh=String(body?.keys?.p256dh||"");
    const auth=String(body?.keys?.auth||"");
    if(!endpoint||!p256dh||!auth)return NextResponse.json({error:"INVALID_SUBSCRIPTION"},{status:400});
    await db.insert(s.pushSubscriptions).values({userId:session.user.id,endpoint,p256dh,auth}).onConflictDoUpdate({target:s.pushSubscriptions.endpoint,set:{userId:session.user.id,p256dh,auth,updatedAt:new Date()}});
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({error:"UNAUTHENTICATED"},{status:401});}
}

export async function DELETE(request:NextRequest){
  try{
    const session=await requireUser();
    const body=await request.json().catch(()=>({}));
    const endpoint=String(body?.endpoint||"");
    if(endpoint)await db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.endpoint,endpoint));
    else await db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.userId,session.user.id));
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({error:"UNAUTHENTICATED"},{status:401});}
}
