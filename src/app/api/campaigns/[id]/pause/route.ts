import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { pauseCampaign } from "@/lib/queue/sender";
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

  if (campaign.status !== "RUNNING") {
    return error("Campaign is not running");
  }

  await pauseCampaign(id);

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "CAMPAIGN_PAUSED",
      entityType: "campaign",
      entityId: id,
    },
  });

  return success({ message: "Campaign paused" });
}
