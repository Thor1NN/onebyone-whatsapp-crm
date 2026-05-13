import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { success, unauthorized } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const payload = authenticateRequest(req);
  if (!payload) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) return unauthorized();

  return success({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}
