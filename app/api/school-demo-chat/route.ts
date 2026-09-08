import { NextRequest, NextResponse } from "next/server";
import { asSchoolDemo } from "@/lib/schoolDemos";
import { schoolDemoSystemPrompt } from "@/lib/schoolDemoKnowledge";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const json = (body: unknown, status=200) => NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
  try {
    const raw = await req.text();
    if (raw.length > 48000) return json({error:"Die Anfrage ist zu lang."},413);
    let body: Record<string,unknown>;
    try { const value: unknown = JSON.parse(raw); if(!value || typeof value!=="object" || Array.isArray(value)) throw new Error(); body=value as Record<string,unknown>; }
    catch { return json({error:"Ungültige Anfrage."},400); }
    const tenant = asSchoolDemo(req.nextUrl.searchParams.get("tenant") || String(body.tenant || ""));
    if (!tenant) return json({error:"Diese Fahrschul-Demo ist nicht bekannt."},400);
    if (!Array.isArray(body.messages) || !body.messages.length) return json({error:"Eine Nachricht fehlt."},400);
    const messages: {role:"user"|"assistant";content:string}[] = [];
    for (const item of body.messages.slice(-20)) {
      if (!item || (item.role!=="user" && item.role!=="assistant") || typeof item.content!=="string" || item.content.length>6000) return json({error:"Ungültige Nachricht."},400);
      messages.push({role:item.role,content:item.content});
    }
    if (messages.at(-1)?.role!=="user") return json({error:"Eine Nutzerfrage fehlt."},400);
    const key = process.env.OPENAI_API_KEY;
    if (!key) return json({error:"Die KI-Verbindung ist noch nicht eingerichtet."},503);
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(),25000);
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions",{
        method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},cache:"no-store",signal:controller.signal,
        body:JSON.stringify({model:process.env.OPENAI_SCHOOL_DEMO_MODEL || "gpt-4o-mini",messages:[{role:"system",content:schoolDemoSystemPrompt(tenant)},...messages],max_completion_tokens:650,store:false}),
      });
      if (!response.ok) return json({error:"Die KI ist momentan nicht erreichbar. Bitte erneut versuchen oder direkt die Fahrschule kontaktieren."},502);
      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (typeof reply!=="string" || !reply.trim()) return json({error:"Keine Antwort empfangen. Bitte erneut versuchen."},502);
      return json({reply});
    } finally { clearTimeout(timeout); }
  } catch { return json({error:"Die Antwort konnte gerade nicht geladen werden. Bitte erneut versuchen."},502); }
}
