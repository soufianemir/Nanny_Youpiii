import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { trackProductEvent } from "@/lib/notifications";

export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
  try{
    const body=await request.json();const raw=String(body?.message||"");const messageCode=/^[A-Z0-9_ -]{1,120}$/.test(raw)?raw:"CLIENT_RUNTIME_ERROR";const digest=String(body?.digest||"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,120);const pathname=String(body?.pathname||"").split("?")[0].slice(0,200);let userId:string|null=null;try{const {data}=await auth.getSession();userId=data?.user?.id||null;}catch{}await trackProductEvent("CLIENT_ERROR",userId,null,{messageCode,digest,pathname});return NextResponse.json({ok:true});
  }catch{return NextResponse.json({ok:false},{status:400});}
}
