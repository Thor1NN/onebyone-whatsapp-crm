import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { success, error, unauthorized } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [messages, total] = await Promise.all([
    prisma.incomingMessage.findMany({
      where,
      include: { contact: true },
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.incomingMessage.count({ where }),
  ]);

  return success({ messages, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

export async function PUT(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  try {
    const { id, status, notes, assignedTo } = await req.json();
    if (!id) return error("Message ID is required");

    const message = await prisma.incomingMessage.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        ...(assignedTo !== undefined && { assignedTo }),
      },
      include: { contact: true },
    });

    return success(message);
  } catch (err) {
    console.error("Update message error:", err);
    return error("Failed to update message", 500);
  }
}
