import TelegramBot from "node-telegram-bot-api";
import { prisma } from "@/lib/prisma";
import { isOptOutMessage } from "@/lib/validators";
import { EventEmitter } from "events";

export type TGStatus =
  | "NOT_CONNECTED"
  | "CONNECTED"
  | "DISCONNECTED"
  | "ERROR";

class TelegramManager extends EventEmitter {
  private bot: TelegramBot | null = null;
  private status: TGStatus = "NOT_CONNECTED";
  private botUsername: string | null = null;
  private botToken: string | null = null;

  getStatus(): TGStatus {
    return this.status;
  }

  getBotUsername(): string | null {
    return this.botUsername;
  }

  isConnected(): boolean {
    return this.status === "CONNECTED";
  }

  async initialize(token: string): Promise<{ success: boolean; error?: string }> {
    if (this.bot) {
      await this.disconnect();
    }

    try {
      this.botToken = token;
      this.bot = new TelegramBot(token, { polling: true });

      const me = await this.bot.getMe();
      this.botUsername = me.username || null;
      this.status = "CONNECTED";

      await prisma.telegramSession.upsert({
        where: { id: "default" },
        update: {
          status: "CONNECTED",
          botToken: token,
          botUsername: this.botUsername,
          lastConnected: new Date(),
        },
        create: {
          id: "default",
          status: "CONNECTED",
          botToken: token,
          botUsername: this.botUsername,
          lastConnected: new Date(),
        },
      });

      // Handle bot added to group
      this.bot.on("new_chat_members", async (msg) => {
        try {
          const botId = (await this.bot!.getMe()).id;
          const wasAdded = msg.new_chat_members?.some((m) => m.id === botId);
          if (wasAdded) {
            const chatId = String(msg.chat.id);
            const chatTitle = msg.chat.title || `Group ${chatId}`;

            // Register group as a contact
            let dbContact = await prisma.contact.findFirst({
              where: { telegramChatId: chatId },
            });

            if (!dbContact) {
              dbContact = await prisma.contact.create({
                data: {
                  name: chatTitle,
                  phoneNumber: `tg_${chatId}`,
                  telegramChatId: chatId,
                  optInStatus: true,
                  optInSource: "Telegram group (bot added)",
                  optInDate: new Date(),
                  notes: `Telegram group: ${chatTitle}`,
                },
              });
            }

            console.log(`[Telegram] Bot added to group: ${chatTitle} (${chatId})`);
            await this.bot!.sendMessage(chatId, `Hello! I'm now connected to this group.`);
          }
        } catch (err) {
          console.error("[Telegram] Error handling new_chat_members:", err);
        }
      });

      // Handle incoming messages (both private and group chats)
      this.bot.on("message", async (msg) => {
        try {
          const chatId = String(msg.chat.id);
          const body = msg.text || "";
          const isGroup = msg.chat.type === "group" || msg.chat.type === "supergroup";
          const chatTitle = msg.chat.title || null;
          const senderName = isGroup
            ? (chatTitle || `Group ${chatId}`)
            : ([msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") ||
               msg.from?.username ||
               "Unknown");

          if (!body) return;

          // Check opt-out (only for private chats)
          if (!isGroup && isOptOutMessage(body)) {
            const contact = await prisma.contact.findFirst({
              where: { telegramChatId: chatId },
            });
            if (contact) {
              await prisma.contact.update({
                where: { id: contact.id },
                data: {
                  isBlacklisted: true,
                  blacklistDate: new Date(),
                  blacklistReason: `Auto-blacklisted: Telegram opt-out "${body}"`,
                },
              });
            }
          }

          // Find or create contact/group entry
          let dbContact = await prisma.contact.findFirst({
            where: { telegramChatId: chatId },
          });

          if (!dbContact) {
            dbContact = await prisma.contact.create({
              data: {
                name: senderName,
                phoneNumber: `tg_${chatId}`,
                telegramChatId: chatId,
                optInStatus: true,
                optInSource: isGroup ? "Telegram group" : "Telegram bot message",
                optInDate: new Date(),
                notes: isGroup ? `Telegram group: ${chatTitle || chatId}` : undefined,
              },
            });
            console.log(
              `[Telegram] New ${isGroup ? "group" : "contact"} registered: ${senderName} (${chatId})`
            );
          }

          await prisma.incomingMessage.create({
            data: {
              contactId: dbContact.id,
              channel: "telegram",
              body: isGroup ? `[${msg.from?.first_name || "Someone"}]: ${body}` : body,
              status: "NEW",
              receivedAt: new Date(),
            },
          });

          this.emit("message", { chatId, body, senderName, isGroup });
        } catch (err) {
          console.error("[Telegram] Error handling incoming message:", err);
        }
      });

      this.bot.on("polling_error", (err) => {
        console.error("[Telegram] Polling error:", err.message);
      });

      this.emit("status", this.status);
      console.log(`[Telegram] Bot connected as @${this.botUsername}`);
      return { success: true };
    } catch (err: unknown) {
      this.status = "ERROR";
      this.bot = null;
      const errorMessage = err instanceof Error ? err.message : "Failed to connect bot";
      console.error("[Telegram] Connection error:", errorMessage);

      await prisma.telegramSession.upsert({
        where: { id: "default" },
        update: { status: "ERROR" },
        create: { id: "default", status: "ERROR" },
      });

      this.emit("status", this.status);
      return { success: false, error: errorMessage };
    }
  }

  async sendMessage(
    chatId: string,
    message: string,
    media?: { url: string; type: string; filename?: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.bot || this.status !== "CONNECTED") {
      return { success: false, error: "Telegram bot is not connected" };
    }

    try {
      let sentMsg;

      if (media) {
        switch (media.type) {
          case "photo":
          case "image":
            sentMsg = await this.bot.sendPhoto(chatId, media.url, {
              caption: message,
            });
            break;
          case "video":
            sentMsg = await this.bot.sendVideo(chatId, media.url, {
              caption: message,
            });
            break;
          case "document":
          case "file":
            sentMsg = await this.bot.sendDocument(chatId, media.url, {
              caption: message,
            });
            break;
          default:
            sentMsg = await this.bot.sendMessage(chatId, message);
        }
      } else {
        sentMsg = await this.bot.sendMessage(chatId, message);
      }

      return { success: true, messageId: String(sentMsg.message_id) };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message";
      return { success: false, error: errorMessage };
    }
  }

  async disconnect(): Promise<void> {
    if (this.bot) {
      try {
        await this.bot.stopPolling();
      } catch {
        // ignore
      }
      this.bot = null;
    }
    this.status = "NOT_CONNECTED";
    this.botUsername = null;
    this.botToken = null;

    await prisma.telegramSession.upsert({
      where: { id: "default" },
      update: { status: "NOT_CONNECTED", lastDisconnected: new Date() },
      create: { id: "default", status: "NOT_CONNECTED" },
    });

    this.emit("status", this.status);
    console.log("[Telegram] Bot disconnected");
  }
}

const globalForTG = globalThis as unknown as { telegram: TelegramManager };
export const telegram = globalForTG.telegram || new TelegramManager();
if (process.env.NODE_ENV !== "production") globalForTG.telegram = telegram;
