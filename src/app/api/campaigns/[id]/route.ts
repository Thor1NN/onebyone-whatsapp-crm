import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { success, error, unauthorized, notFound } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, email: true } },
      recipients: {
        include: { contact: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!campaign) return notFound("Campaign not found");
  return success(campaign);
}
