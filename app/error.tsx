"use client";
import { useEffect } from "react";

export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  useEffect(()=>{fetch("/api/telemetry/error",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({message:error.message,digest:error.digest,pathname:window.location.pathname})}).catch(()=>{});},[error]);
  return <main className="v4-main v5-error"><section className="v4-card"><span className="v4-logo">Y</span><span className="v4-eyebrow">Un souci est survenu</span><h1>On reprend sans perdre le fil.</h1><p>Réessayez l’écran. Si le problème persiste, revenez à Aujourd’hui ; l’erreur technique a été enregistrée sans contenu privé de l’enfant.</p><div className="v5-inline-buttons"><button className="btn brandbtn" onClick={reset}>Réessayer</button><a className="btn soft" href="/app?section=today">Aujourd’hui</a></div></section></main>;
}
