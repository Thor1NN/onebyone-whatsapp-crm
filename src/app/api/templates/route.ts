import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { templateSchema } from "@/lib/validators";
import { success, error, unauthorized, notFound } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  const templates = await prisma.messageTemplate.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return success(templates);
}

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const parsed = templateSchema.safeParse(body);
    if (!parsed.success) return error(parsed.error.message);

    const template = await prisma.messageTemplate.create({
      data: parsed.data,
    });

    return success(template, 201);
  } catch (err) {
    console.error("Create template error:", err);
    return error("Failed to create template", 500);
  }
}

export async function PUT(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return error("Template ID is required");

    const parsed = templateSchema.safeParse(data);
    if (!parsed.success) return error(parsed.error.message);

    const existing = await prisma.messageTemplate.findUnique({ where: { id } });
    if (!existing) return notFound("Template not found");

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: parsed.data,
    });

    return success(template);
  } catch (err) {
    console.error("Update template error:", err);
    return error("Failed to update template", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  try {
    const { id } = await req.json();
    if (!id) return error("Template ID is required");

    await prisma.messageTemplate.delete({ where: { id } });
    return success({ message: "Template deleted" });
  } catch (err) {
    console.error("Delete template error:", err);
    return error("Failed to delete template", 500);
  }
}
