import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { campaignSchema } from "@/lib/validators";
import { success, error, unauthorized } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  const campaigns = await prisma.campaign.findMany({
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return success(campaigns);
}

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const parsed = campaignSchema.safeParse(body);
    if (!parsed.success) return error(parsed.error.message);

    const data = parsed.data;

    if (data.minDelay >= data.maxDelay) {
      return error("Minimum delay must be less than maximum delay");
    }

    let contactIds: string[] = data.contactIds || [];

    if (data.tagIds?.length) {
      const tagContacts = await prisma.contactTag.findMany({
        where: { tagId: { in: data.tagIds } },
        select: { contactId: true },
      });
      const fromTags = tagContacts.map((tc) => tc.contactId);
      contactIds = [...new Set([...contactIds, ...fromTags])];
    }

    if (contactIds.length === 0) {
      return error("No contacts selected for campaign");
    }

    const contacts = await prisma.contact.findMany({
      where: {
        id: { in: contactIds },
        isBlacklisted: false,
        ...(data.adminOverride ? {} : { optInStatus: true }),
      },
    });

    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        channel: data.channel || "whatsapp",
        messageBody: data.messageBody,
        templateId: data.templateId,
        attachmentUrl: data.attachmentUrl,
        attachmentType: data.attachmentType,
        minDelay: data.minDelay,
        maxDelay: data.maxDelay,
        dailyLimit: data.dailyLimit,
        businessHoursOnly: data.businessHoursOnly,
        businessHourStart: data.businessHourStart,
        businessHourEnd: data.businessHourEnd,
        lunchBreakStart: data.lunchBreakStart,
        lunchBreakEnd: data.lunchBreakEnd,
        adminOverride: data.adminOverride,
        scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null,
        totalRecipients: contacts.length,
        createdById: user.userId,
        recipients: {
          create: contacts.map((c) => ({
            contactId: c.id,
            status: "PENDING",
          })),
        },
      },
      include: {
        recipients: { include: { contact: true } },
        createdBy: { select: { name: true, email: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "CAMPAIGN_CREATED",
        entityType: "campaign",
        entityId: campaign.id,
        details: JSON.stringify({
          name: campaign.name,
          recipientCount: contacts.length,
        }),
      },
    });

    return success(campaign, 201);
  } catch (err) {
    console.error("Create campaign error:", err);
    return error("Failed to create campaign", 500);
  }
}
