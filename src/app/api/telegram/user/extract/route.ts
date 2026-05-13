import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { telegramUser } from "@/lib/telegram/user-client";
import { success, error, unauthorized } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  if (!telegramUser.isConnected()) {
    return error("Telegram user account not connected");
  }

  try {
    const { groupId, groupTitle } = await req.json();
    if (!groupId) return error("Group ID is required");

    const members = await telegramUser.extractMembers(groupId);

    let created = 0;
    let skipped = 0;

    for (const m of members) {
      if (m.isBot) {
        skipped++;
        continue;
      }

      const displayName =
        [m.firstName, m.lastName].filter(Boolean).join(" ") ||
        m.username ||
        `TG User ${m.id}`;

      // Use phone if available, otherwise tg_<id>
      const phoneNumber = m.phone || `tg_${m.id}`;

      try {
        const existing = await prisma.contact.findFirst({
          where: {
            OR: [
              { telegramChatId: m.id },
              { phoneNumber },
            ],
          },
        });

        if (existing) {
          // Update telegramChatId if missing
          if (!existing.telegramChatId) {
            await prisma.contact.update({
              where: { id: existing.id },
              data: { telegramChatId: m.id },
            });
          }
          skipped++;
          continue;
        }

        await prisma.contact.create({
          data: {
            name: displayName,
            phoneNumber,
            telegramChatId: m.id,
            optInStatus: false, // IMPORTANT: extracted members are NOT opted in
            optInSource: `Extracted from Telegram group: ${groupTitle || groupId}`,
            notes: `Telegram username: @${m.username || "—"}\nExtracted from: ${groupTitle || groupId}`,
          },
        });
        created++;
      } catch (err) {
        console.error(`Failed to add member ${m.id}:`, err);
        skipped++;
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "TELEGRAM_MEMBERS_EXTRACTED",
        entityType: "contact",
        details: JSON.stringify({
          groupId,
          groupTitle,
          totalFound: members.length,
          created,
          skipped,
        }),
      },
    });

    return success({
      totalFound: members.length,
      created,
      skipped,
      message: `Extracted ${created} new contacts (${skipped} already existed or skipped)`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to extract";
    console.error("extract error:", msg);
    return error(msg, 500);
  }
}
