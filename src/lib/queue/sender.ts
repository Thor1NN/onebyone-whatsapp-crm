import { prisma } from "@/lib/prisma";
import { whatsapp } from "@/lib/whatsapp/manager";
import { telegram } from "@/lib/telegram/manager";
import { personalizeMessage } from "@/lib/validators";
import { generateRandomDelay, isWithinBusinessHours, isInLunchBreak, sleep } from "@/lib/utils";

interface ActiveCampaign {
  id: string;
  running: boolean;
}

const activeCampaigns = new Map<string, ActiveCampaign>();

export function isCampaignRunning(campaignId: string): boolean {
  return activeCampaigns.get(campaignId)?.running === true;
}

export async function startCampaign(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      recipients: {
        include: { contact: true },
        where: { status: { in: ["PENDING", "WAITING"] } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!campaign) throw new Error("Campaign not found");

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "RUNNING", startedAt: campaign.startedAt || new Date() },
  });

  const tracker: ActiveCampaign = { id: campaignId, running: true };
  activeCampaigns.set(campaignId, tracker);

  // Run the sending loop in background — don't await
  processCampaign(campaign, tracker).catch((err) => {
    console.error(`[Sender] Campaign ${campaignId} error:`, err);
  });
}

async function processCampaign(
  campaign: {
    id: string;
    channel: string;
    messageBody: string;
    minDelay: number;
    maxDelay: number;
    dailyLimit: number;
    businessHoursOnly: boolean;
    businessHourStart: string | null;
    businessHourEnd: string | null;
    lunchBreakStart: string | null;
    lunchBreakEnd: string | null;
    attachmentUrl: string | null;
    attachmentType: string | null;
    adminOverride: boolean;
    recipients: Array<{
      id: string;
      status: string;
      retryCount: number;
      contact: {
        id: string;
        name: string | null;
        phoneNumber: string;
        telegramChatId: string | null;
        company: string | null;
        custom1: string | null;
        isBlacklisted: boolean;
        optInStatus: boolean;
      };
    }>;
  },
  tracker: ActiveCampaign
): Promise<void> {
  const channel = campaign.channel || "whatsapp";
  let sentToday = 0;

  for (const recipient of campaign.recipients) {
    // Check if campaign was stopped/paused
    if (!tracker.running) {
      console.log(`[Sender] Campaign ${campaign.id} stopped by user`);
      return;
    }

    // Re-check campaign status from DB
    const freshCampaign = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      select: { status: true },
    });
    if (!freshCampaign || freshCampaign.status !== "RUNNING") {
      tracker.running = false;
      return;
    }

    // Daily limit check
    if (sentToday >= campaign.dailyLimit) {
      console.log(`[Sender] Daily limit reached (${campaign.dailyLimit})`);
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "PAUSED" },
      });
      tracker.running = false;
      return;
    }

    // Skip blacklisted
    if (recipient.contact.isBlacklisted) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "SKIPPED", errorMessage: "Contact is blacklisted" },
      });
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { skippedCount: { increment: 1 } },
      });
      continue;
    }

    // Skip no opt-in (unless admin override)
    if (!recipient.contact.optInStatus && !campaign.adminOverride) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "SKIPPED", errorMessage: "No opt-in consent" },
      });
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { skippedCount: { increment: 1 } },
      });
      continue;
    }

    // For Telegram campaigns, skip contacts without a telegramChatId
    if (channel === "telegram" && !recipient.contact.telegramChatId) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "SKIPPED", errorMessage: "No Telegram chat ID" },
      });
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { skippedCount: { increment: 1 } },
      });
      continue;
    }

    // Business hours check — wait if outside hours
    if (campaign.businessHoursOnly && campaign.businessHourStart && campaign.businessHourEnd) {
      while (!isWithinBusinessHours(campaign.businessHourStart, campaign.businessHourEnd)) {
        if (!tracker.running) return;
        console.log(`[Sender] Outside business hours, waiting 5 min...`);
        await sleep(300_000);
      }
    }

    // Lunch break check
    if (campaign.lunchBreakStart && campaign.lunchBreakEnd) {
      while (isInLunchBreak(campaign.lunchBreakStart, campaign.lunchBreakEnd)) {
        if (!tracker.running) return;
        console.log(`[Sender] Lunch break, waiting 5 min...`);
        await sleep(300_000);
      }
    }

    // Generate random delay
    const delay = generateRandomDelay(campaign.minDelay, campaign.maxDelay);

    // Mark as SENDING
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: { status: "SENDING", delayUsed: delay },
    });

    // Personalize message
    const personalizedMessage = personalizeMessage(campaign.messageBody, {
      name: recipient.contact.name,
      phoneNumber: recipient.contact.phoneNumber,
      company: recipient.contact.company,
      custom1: recipient.contact.custom1,
    });

    // Check channel connection
    if (channel === "whatsapp" && !whatsapp.isConnected()) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "FAILED", errorMessage: "WhatsApp not connected" },
      });
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "PAUSED", failedCount: { increment: 1 } },
      });
      tracker.running = false;
      console.log(`[Sender] WhatsApp disconnected — campaign paused`);
      return;
    }

    if (channel === "telegram" && !telegram.isConnected()) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "FAILED", errorMessage: "Telegram bot not connected" },
      });
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "PAUSED", failedCount: { increment: 1 } },
      });
      tracker.running = false;
      console.log(`[Sender] Telegram disconnected — campaign paused`);
      return;
    }

    // Send the message via the appropriate channel
    const media = campaign.attachmentUrl
      ? { url: campaign.attachmentUrl, type: campaign.attachmentType || "image" }
      : undefined;

    let result: { success: boolean; messageId?: string; error?: string };

    if (channel === "telegram") {
      result = await telegram.sendMessage(
        recipient.contact.telegramChatId!,
        personalizedMessage,
        media
      );
    } else {
      result = await whatsapp.sendMessage(
        recipient.contact.phoneNumber,
        personalizedMessage,
        media
      );
    }

    const now = new Date();

    if (result.success) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "SENT", sentAt: now },
      });

      await prisma.messageLog.create({
        data: {
          campaignId: campaign.id,
          contactId: recipient.contact.id,
          channel,
          messageBody: personalizedMessage,
          status: "SENT",
          whatsappMsgId: result.messageId,
          sentAt: now,
          delayUsed: delay,
        },
      });

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { sentCount: { increment: 1 } },
      });

      sentToday++;
      console.log(
        `[Sender][${channel}] Sent to ${recipient.contact.name || recipient.contact.phoneNumber} (delay: ${delay}s)`
      );
    } else {
      // Retry logic
      if (recipient.retryCount < 2) {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "WAITING",
            retryCount: { increment: 1 },
            errorMessage: result.error,
          },
        });
        console.log(
          `[Sender] Failed for ${recipient.contact.phoneNumber}, will retry (${recipient.retryCount + 1}/2)`
        );
      } else {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "FAILED", errorMessage: result.error },
        });

        await prisma.messageLog.create({
          data: {
            campaignId: campaign.id,
            contactId: recipient.contact.id,
            channel,
            messageBody: personalizedMessage,
            status: "FAILED",
            errorMessage: result.error,
          },
        });

        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { failedCount: { increment: 1 } },
        });
        console.log(
          `[Sender] Permanently failed for ${recipient.contact.phoneNumber}: ${result.error}`
        );
      }
    }

    // Wait the randomized delay before next message
    if (tracker.running) {
      console.log(`[Sender] Waiting ${delay}s before next message...`);
      for (let i = 0; i < delay; i++) {
        if (!tracker.running) return;
        await sleep(1000);
      }
    }
  }

  // Campaign completed
  if (tracker.running) {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    tracker.running = false;
    activeCampaigns.delete(campaign.id);
    console.log(`[Sender] Campaign ${campaign.id} completed`);
  }
}

export async function pauseCampaign(campaignId: string): Promise<void> {
  const tracker = activeCampaigns.get(campaignId);
  if (tracker) tracker.running = false;

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "PAUSED" },
  });

  await prisma.campaignRecipient.updateMany({
    where: {
      campaignId,
      status: { in: ["SENDING", "WAITING"] },
    },
    data: { status: "PENDING" },
  });
}

export async function stopCampaign(campaignId: string): Promise<void> {
  const tracker = activeCampaigns.get(campaignId);
  if (tracker) tracker.running = false;
  activeCampaigns.delete(campaignId);

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "STOPPED", completedAt: new Date() },
  });

  await prisma.campaignRecipient.updateMany({
    where: {
      campaignId,
      status: { in: ["PENDING", "WAITING", "SENDING"] },
    },
    data: { status: "CANCELLED" },
  });
}
