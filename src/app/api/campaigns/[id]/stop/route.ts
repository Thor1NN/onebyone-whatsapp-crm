import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { stopCampaign } from "@/lib/queue/sender";
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

  await stopCampaign(id);

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "CAMPAIGN_STOPPED",
      entityType: "campaign",
      entityId: id,
    },
  });

  return success({ message: "Campaign stopped" });
}
