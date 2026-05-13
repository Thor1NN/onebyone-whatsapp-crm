import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { success, error, unauthorized } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  try {
    const { contactId, reason } = await req.json();
    if (!contactId) return error("Contact ID is required");

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) return error("Contact not found", 404);

    await prisma.contact.update({
      where: { id: contactId },
      data: {
        isBlacklisted: true,
        blacklistDate: new Date(),
        blacklistReason: reason || "Manually blacklisted",
      },
    });

    await prisma.blacklist.upsert({
      where: { phoneNumber: contact.phoneNumber },
      update: { reason: reason || "Manually blacklisted", addedBy: user.userId },
      create: {
        phoneNumber: contact.phoneNumber,
        reason: reason || "Manually blacklisted",
        addedBy: user.userId,
      },
    });

    return success({ message: "Contact blacklisted" });
  } catch (err) {
    console.error("Blacklist error:", err);
    return error("Failed to blacklist contact", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  try {
    const { contactId } = await req.json();
    if (!contactId) return error("Contact ID is required");

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) return error("Contact not found", 404);

    await prisma.contact.update({
      where: { id: contactId },
      data: { isBlacklisted: false, blacklistDate: null, blacklistReason: null },
    });

    await prisma.blacklist.deleteMany({
      where: { phoneNumber: contact.phoneNumber },
    });

    return success({ message: "Contact removed from blacklist" });
  } catch (err) {
    console.error("Unblacklist error:", err);
    return error("Failed to remove from blacklist", 500);
  }
}
