import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { whatsapp } from "@/lib/whatsapp/manager";
import { telegram } from "@/lib/telegram/manager";
import { startCampaign } from "@/lib/queue/sender";
import { success, error, unauthorized } from "@/lib/api-response";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) return error("Campaign not found", 404);

  // Check appropriate channel is connected
  if (campaign.channel === "telegram") {
    if (!telegram.isConnected()) {
      return error("Telegram bot is not connected. Please connect first.");
    }
  } else {
    if (!whatsapp.isConnected()) {
      return error("WhatsApp is not connected. Please connect first.");
    }
  }

  if (campaign.status !== "DRAFT" && campaign.status !== "PAUSED") {
    return error(`Cannot start campaign with status: ${campaign.status}`);
  }

  try {
    await startCampaign(id);

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "CAMPAIGN_STARTED",
        entityType: "campaign",
        entityId: id,
        details: JSON.stringify({ name: campaign.name, channel: campaign.channel }),
      },
    });

    return success({ message: "Campaign started" });
  } catch (err) {
    console.error("Start campaign error:", err);
    return error("Failed to start campaign", 500);
  }
}
