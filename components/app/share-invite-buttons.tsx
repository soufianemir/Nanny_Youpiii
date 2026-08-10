"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function ShareInviteButtons({url,email}:{url:string;email:string}){
  const [qr,setQr]=useState("");const [copied,setCopied]=useState(false);useEffect(()=>{QRCode.toDataURL(url,{width:220,margin:1}).then(setQr).catch(()=>{});},[url]);
  const text=`Rejoins notre espace Nanny Youpiii : ${url}`;
  async function share(){if(navigator.share){await navigator.share({title:"Invitation Nanny Youpiii",text,url});return;}await navigator.clipboard.writeText(url);setCopied(true);}
  async function copy(){await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1600);}
  return <details className="v5-share-invite"><summary>Partager autrement</summary><div className="v5-share-grid"><button type="button" className="btn soft" onClick={share}>Partager</button><a className="btn soft" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a><a className="btn soft" href={`sms:?&body=${encodeURIComponent(text)}`}>SMS</a><button type="button" className="btn soft" onClick={copy}>{copied?"Copié ✓":"Copier le lien"}</button></div>{qr&&<div className="v5-qr"><img src={qr} alt={`QR code d’invitation pour ${email}`}/><small>À scanner avec l’appareil photo du téléphone</small></div>}</details>;
}
