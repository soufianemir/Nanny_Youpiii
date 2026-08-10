import crypto from "node:crypto";
import { appBaseUrl, neonAuthCookieSecret } from "@/lib/env";

export function invitationSignature(id:string,email:string){return crypto.createHmac("sha256",neonAuthCookieSecret()).update(`invite:${id}:${email.toLowerCase()}`).digest("base64url");}
export function validInvitationSignature(id:string,email:string,signature:string){const expected=invitationSignature(id,email);try{return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(signature));}catch{return false;}}
export function invitationShareUrl(invite:{id:string;email:string}){return `${appBaseUrl()}/join/${invite.id}?sig=${encodeURIComponent(invitationSignature(invite.id,invite.email))}`;}
