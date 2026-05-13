import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { contactSchema, normalizePhoneNumber, isValidPhoneNumber } from "@/lib/validators";
import { success, error, unauthorized } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const tag = searchParams.get("tag") || "";
  const optIn = searchParams.get("optIn");
  const blacklisted = searchParams.get("blacklisted");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phoneNumber: { contains: search } },
      { company: { contains: search } },
    ];
  }

  if (tag) {
    where.tags = { some: { tag: { name: tag } } };
  }

  if (optIn !== null && optIn !== undefined && optIn !== "") {
    where.optInStatus = optIn === "true";
  }

  if (blacklisted !== null && blacklisted !== undefined && blacklisted !== "") {
    where.isBlacklisted = blacklisted === "true";
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ]);

  return success({
    contacts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return error(parsed.error.message);
    }

    const data = parsed.data;
    const phone = normalizePhoneNumber(data.phoneNumber, data.countryCode);

    if (!isValidPhoneNumber(phone)) {
      return error("Invalid phone number format");
    }

    const existing = await prisma.contact.findUnique({
      where: { phoneNumber: phone },
    });
    if (existing) {
      return error("Contact with this phone number already exists", 409);
    }

    const contact = await prisma.contact.create({
      data: {
        name: data.name,
        phoneNumber: phone,
        countryCode: data.countryCode,
        company: data.company,
        custom1: data.custom1,
        notes: data.notes,
        optInStatus: data.optInStatus,
        optInSource: data.optInSource,
        optInDate: data.optInStatus ? new Date() : null,
        tags: data.tags?.length
          ? {
              create: data.tags.map((tagId) => ({ tagId })),
            }
          : undefined,
      },
      include: { tags: { include: { tag: true } } },
    });

    return success(contact, 201);
  } catch (err) {
    console.error("Create contact error:", err);
    return error("Failed to create contact", 500);
  }
}
