import { toNextJsHandler } from "better-auth/next-js";
import { serverConfigured } from "@/lib/env";

export async function GET(request: Request) {
  if (!serverConfigured()) return Response.json({ error: "Nanny Youpiii V3 backend is not configured" }, { status: 503 });
  const { auth } = await import("@/lib/auth");
  return toNextJsHandler(auth).GET(request);
}
export async function POST(request: Request) {
  if (!serverConfigured()) return Response.json({ error: "Nanny Youpiii V3 backend is not configured" }, { status: 503 });
  const { auth } = await import("@/lib/auth");
  return toNextJsHandler(auth).POST(request);
}
