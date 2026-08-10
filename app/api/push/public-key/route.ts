import { NextResponse } from "next/server";
import { webPushPublicKey } from "@/lib/push";

export const dynamic="force-dynamic";
export async function GET(){return NextResponse.json({publicKey:webPushPublicKey()},{headers:{"Cache-Control":"private, max-age=3600"}});}
