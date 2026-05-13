import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { success, error, unauthorized } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  const settings = await prisma.settings.findMany();
  const mapped = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return success(mapped);
}

export async function PUT(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();

    for (const [key, value] of Object.entries(body)) {
      await prisma.settings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    return success({ message: "Settings updated" });
  } catch (err) {
    console.error("Settings error:", err);
    return error("Failed to update settings", 500);
  }
}
