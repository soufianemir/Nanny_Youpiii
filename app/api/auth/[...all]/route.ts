import { auth } from "@/lib/auth";
import { serverConfigured } from "@/lib/env";

const handler = auth.handler();

export async function GET(request: Request) {
  if (!serverConfigured()) return Response.json({ error: "Nanny Youpiii V3 backend is not configured" }, { status: 503 });
  return handler.GET(request);
}

export async function POST(request: Request) {
  if (!serverConfigured()) return Response.json({ error: "Nanny Youpiii V3 backend is not configured" }, { status: 503 });
  return handler.POST(request);
}
