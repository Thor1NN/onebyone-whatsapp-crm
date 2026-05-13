import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import { prisma } from "@/lib/prisma";
import { isOptOutMessage } from "@/lib/validators";
import { EventEmitter } from "events";

export type WAStatus =
  | "NOT_CONNECTED"
  | "QR_WAITING"
  | "CONNECTED"
  | "DISCONNECTED"
  | "RECONNECTING";

class WhatsAppManager extends EventEmitter {
  private client: Client | null = null;
  private status: WAStatus = "NOT_CONNECTED";
  private qrCode: string | null = null;
  private phoneNumber: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  getStatus(): WAStatus {
    return this.status;
  }

  getQRCode(): string | null {
    return this.qrCode;
  }

  getPhoneNumber(): string | null {
    return this.phoneNumber;
  }

  isConnected(): boolean {
    return this.status === "CONNECTED";
  }

  async initialize(): Promise<void> {
    if (this.client) {
      await this.destroy();
    }

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: ".wwebjs_auth" }),
      puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--single-process",
        ],
      },
    });

    this.client.on("qr", (qr: string) => {
      this.qrCode = qr;
      this.status = "QR_WAITING";
      this.emit("qr", qr);
      this.emit("status", this.status);
    });

    this.client.on("ready", async () => {
      this.status = "CONNECTED";
      this.qrCode = null;
      this.reconnectAttempts = 0;

      const info = this.client?.info;
      this.phoneNumber = info?.wid?.user || null;

      await prisma.whatsAppSession.upsert({
        where: { id: "default" },
        update: {
          status: "CONNECTED",
          phoneNumber: this.phoneNumber,
          lastConnected: new Date(),
        },
        create: {
          id: "default",
          status: "CONNECTED",
          phoneNumber: this.phoneNumber,
          lastConnected: new Date(),
        },
      });

      this.emit("ready");
      this.emit("status", this.status);
    });

    this.client.on("authenticated", () => {
      console.log("[WhatsApp] Authenticated");
    });

    this.client.on("auth_failure", () => {
      this.status = "DISCONNECTED";
      this.emit("status", this.status);
      console.error("[WhatsApp] Authentication failure");
    });

    this.client.on("disconnected", async (reason: string) => {
      this.status = "DISCONNECTED";
      this.phoneNumber = null;

      await prisma.whatsAppSession.upsert({
        where: { id: "default" },
        update: {
          status: "DISCONNECTED",
          lastDisconnected: new Date(),
        },
        create: {
          id: "default",
          status: "DISCONNECTED",
          lastDisconnected: new Date(),
        },
      });

      this.emit("disconnected", reason);
      this.emit("status", this.status);

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        this.status = "RECONNECTING";
        this.emit("status", this.status);
        console.log(
          `[WhatsApp] Reconnecting attempt ${this.reconnectAttempts}...`
        );
        setTimeout(() => this.initialize(), 5000 * this.reconnectAttempts);
      }
    });

    this.client.on("message", async (msg) => {
      try {
        const contact = msg.from.replace("@c.us", "");
        const body = msg.body;

        if (isOptOutMessage(body)) {
          await prisma.contact.updateMany({
            where: { phoneNumber: { contains: contact } },
            data: {
              isBlacklisted: true,
              blacklistDate: new Date(),
              blacklistReason: `Auto-blacklisted: opt-out message "${body}"`,
            },
          });

          await prisma.blacklist.upsert({
            where: { phoneNumber: contact },
            update: { reason: `Opt-out: "${body}"` },
            create: { phoneNumber: contact, reason: `Opt-out: "${body}"` },
          });
        }

        const dbContact = await prisma.contact.findFirst({
          where: { phoneNumber: { contains: contact } },
        });

        if (dbContact) {
          await prisma.incomingMessage.create({
            data: {
              contactId: dbContact.id,
              body,
              status: "NEW",
              receivedAt: new Date(),
            },
          });
        }

        this.emit("message", { from: contact, body });
      } catch (err) {
        console.error("[WhatsApp] Error handling incoming message:", err);
      }
    });

    this.status = "QR_WAITING";
    this.emit("status", this.status);

    await this.client.initialize();
  }

  async sendMessage(
    phoneNumber: string,
    message: string,
    media?: { url: string; type: string; filename?: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.client || this.status !== "CONNECTED") {
      return { success: false, error: "WhatsApp is not connected" };
    }

    try {
      const chatId = phoneNumber.replace("+", "") + "@c.us";

      if (media) {
        const attachment = await MessageMedia.fromUrl(media.url);
        await this.client.sendMessage(chatId, attachment, { caption: message });
      } else {
        await this.client.sendMessage(chatId, message);
      }

      return { success: true, messageId: chatId };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      return { success: false, error: errorMessage };
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.logout();
      await this.client.destroy();
      this.client = null;
    }
    this.status = "NOT_CONNECTED";
    this.qrCode = null;
    this.phoneNumber = null;

    await prisma.whatsAppSession.upsert({
      where: { id: "default" },
      update: { status: "NOT_CONNECTED", lastDisconnected: new Date() },
      create: { id: "default", status: "NOT_CONNECTED" },
    });

    this.emit("status", this.status);
  }

  async destroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.destroy();
      } catch {
        // ignore
      }
      this.client = null;
    }
  }
}

const globalForWA = globalThis as unknown as { whatsapp: WhatsAppManager };
export const whatsapp = globalForWA.whatsapp || new WhatsAppManager();
if (process.env.NODE_ENV !== "production") globalForWA.whatsapp = whatsapp;
