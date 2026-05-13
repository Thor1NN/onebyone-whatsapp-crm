import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";
import { error, success, unauthorized, forbidden } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    try {
      requireAdmin(req);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unauthorized";
      if (msg === "Forbidden") return forbidden();
      return unauthorized();
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return error(parsed.error.message);
    }

    const { name, email, password, role } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return error("Email already registered", 409);
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return success(user, 201);
  } catch (err) {
    console.error("Register error:", err);
    return error("Internal server error", 500);
  }
}
