import { auth } from "@/lib/auth";
import { serverConfigured } from "@/lib/env";

const handler = auth.handler();

type RouteContext = { params: Promise<Record<string, string | string[]>> };

export async function GET(request: Request, context: RouteContext) {
  if (!serverConfigured()) return Response.json({ error: "Nanny Youpiii V3 backend is not configured" }, { status: 503 });
  return handler.GET(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  if (!serverConfigured()) return Response.json({ error: "Nanny Youpiii V3 backend is not configured" }, { status: 503 });
  return handler.POST(request, context);
}
