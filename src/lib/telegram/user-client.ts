import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { prisma } from "@/lib/prisma";

export type TGUserStatus =
  | "NOT_CONNECTED"
  | "AWAITING_CODE"
  | "AWAITING_PASSWORD"
  | "CONNECTED"
  | "ERROR";

interface PendingAuth {
  client: TelegramClient;
  phoneCodeHash: string;
  apiId: number;
  apiHash: string;
  phoneNumber: string;
  resolveCode?: (code: string) => void;
  resolvePassword?: (password: string) => void;
  authPromise?: Promise<void>;
}

class TelegramUserManager {
  private client: TelegramClient | null = null;
  private status: TGUserStatus = "NOT_CONNECTED";
  private pending: PendingAuth | null = null;
  private username: string | null = null;
  private firstName: string | null = null;

  getStatus(): TGUserStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === "CONNECTED" && this.client !== null;
  }

  getInfo() {
    return {
      status: this.status,
      username: this.username,
      firstName: this.firstName,
    };
  }

  async restoreSession(): Promise<void> {
    try {
      const session = await prisma.telegramUserSession.findUnique({
        where: { id: "default" },
      });

      if (!session?.sessionString || !session.apiId || !session.apiHash) return;

      const stringSession = new StringSession(session.sessionString);
      this.client = new TelegramClient(
        stringSession,
        parseInt(session.apiId),
        session.apiHash,
        { connectionRetries: 5 }
      );

      await this.client.connect();
      const me = await this.client.getMe();
      this.username = (me as Api.User).username || null;
      this.firstName = (me as Api.User).firstName || null;
      this.status = "CONNECTED";

      console.log(`[TG-User] Session restored: @${this.username}`);
    } catch (err) {
      console.error("[TG-User] Restore failed:", err);
      this.status = "NOT_CONNECTED";
    }
  }

  async startAuth(
    apiId: string,
    apiHash: string,
    phoneNumber: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.disconnect();

      const stringSession = new StringSession("");
      const client = new TelegramClient(stringSession, parseInt(apiId), apiHash, {
        connectionRetries: 5,
      });

      await client.connect();

      // Pre-create pending state so the callbacks below can resolve into it
      this.pending = {
        client,
        phoneCodeHash: "",
        apiId: parseInt(apiId),
        apiHash,
        phoneNumber,
      };
      this.status = "AWAITING_CODE";

      // Start auth flow in background — it'll wait on our promises for code/password
      const authPromise = client.start({
        phoneNumber: async () => phoneNumber,
        phoneCode: async () => {
          return new Promise<string>((resolve) => {
            if (this.pending) {
              this.pending.resolveCode = resolve;
              this.status = "AWAITING_CODE";
            }
          });
        },
        password: async () => {
          return new Promise<string>((resolve) => {
            if (this.pending) {
              this.pending.resolvePassword = resolve;
              this.status = "AWAITING_PASSWORD";
            }
          });
        },
        onError: (err) => {
          console.error("[TG-User] Auth error:", err);
        },
      });

      this.pending.authPromise = authPromise;

      // After auth completes, save session
      authPromise
        .then(async () => {
          this.client = client;
          const me = await client.getMe();
          this.username = (me as Api.User).username || null;
          this.firstName = (me as Api.User).firstName || null;
          this.status = "CONNECTED";

          const sessionString = (client.session as StringSession).save();

          await prisma.telegramUserSession.upsert({
            where: { id: "default" },
            update: {
              apiId,
              apiHash,
              phoneNumber,
              sessionString,
              username: this.username,
              firstName: this.firstName,
              status: "CONNECTED",
              lastConnected: new Date(),
            },
            create: {
              id: "default",
              apiId,
              apiHash,
              phoneNumber,
              sessionString,
              username: this.username,
              firstName: this.firstName,
              status: "CONNECTED",
              lastConnected: new Date(),
            },
          });

          this.pending = null;
          console.log(`[TG-User] Connected as @${this.username}`);
        })
        .catch((err) => {
          console.error("[TG-User] Auth failed:", err);
          this.status = "ERROR";
          this.pending = null;
        });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start auth";
      console.error("[TG-User] startAuth error:", msg);
      this.status = "ERROR";
      return { success: false, error: msg };
    }
  }

  async submitCode(code: string): Promise<{ success: boolean; error?: string }> {
    if (!this.pending || !this.pending.resolveCode) {
      return { success: false, error: "No pending authentication" };
    }
    this.pending.resolveCode(code);
    this.pending.resolveCode = undefined;
    return { success: true };
  }

  async submitPassword(password: string): Promise<{ success: boolean; error?: string }> {
    if (!this.pending || !this.pending.resolvePassword) {
      return { success: false, error: "No pending password" };
    }
    this.pending.resolvePassword(password);
    this.pending.resolvePassword = undefined;
    return { success: true };
  }

  /**
   * List all groups and channels the user is in
   */
  async listGroups(): Promise<
    Array<{ id: string; title: string; type: string; membersCount: number }>
  > {
    if (!this.client || this.status !== "CONNECTED") {
      throw new Error("Not connected");
    }

    const dialogs = await this.client.getDialogs({ limit: 200 });
    const groups: Array<{
      id: string;
      title: string;
      type: string;
      membersCount: number;
    }> = [];

    for (const dialog of dialogs) {
      const entity = dialog.entity;
      if (!entity) continue;

      const isGroup = entity.className === "Chat" || entity.className === "Channel";
      if (!isGroup) continue;

      const channel = entity as Api.Chat | Api.Channel;
      // Skip channels that aren't groups (broadcast channels with no members access)
      const isMegagroup = "megagroup" in channel && channel.megagroup;
      const isBasicGroup = entity.className === "Chat";

      if (!isMegagroup && !isBasicGroup && entity.className === "Channel") {
        // Skip broadcast channels (we usually can't list members)
        continue;
      }

      groups.push({
        id: String(entity.id),
        title: channel.title || "Untitled",
        type: entity.className,
        membersCount: "participantsCount" in channel ? channel.participantsCount || 0 : 0,
      });
    }

    return groups;
  }

  /**
   * Extract members from a group
   */
  async extractMembers(
    groupId: string
  ): Promise<
    Array<{
      id: string;
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      isBot: boolean;
    }>
  > {
    if (!this.client || this.status !== "CONNECTED") {
      throw new Error("Not connected");
    }

    const entity = await this.client.getEntity(groupId);
    const members: Array<{
      id: string;
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      isBot: boolean;
    }> = [];

    try {
      const participants = await this.client.getParticipants(entity, { limit: 5000 });
      for (const p of participants) {
        if (p.className !== "User") continue;
        const user = p as Api.User;
        if (user.deleted) continue;
        members.push({
          id: String(user.id),
          username: user.username || null,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          phone: user.phone ? `+${user.phone}` : null,
          isBot: user.bot || false,
        });
      }
    } catch (err) {
      console.error(`[TG-User] Failed to get participants:`, err);
      throw new Error(
        "Failed to extract members. You may not have permission to view this group's members."
      );
    }

    return members;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch {
        // ignore
      }
      this.client = null;
    }
    if (this.pending) {
      try {
        await this.pending.client.disconnect();
      } catch {
        // ignore
      }
      this.pending = null;
    }
    this.status = "NOT_CONNECTED";
    this.username = null;
    this.firstName = null;

    await prisma.telegramUserSession.upsert({
      where: { id: "default" },
      update: { status: "NOT_CONNECTED", sessionString: null },
      create: { id: "default", status: "NOT_CONNECTED" },
    });
  }
}

const globalForTGUser = globalThis as unknown as { telegramUser: TelegramUserManager };
export const telegramUser = globalForTGUser.telegramUser || new TelegramUserManager();
if (process.env.NODE_ENV !== "production") globalForTGUser.telegramUser = telegramUser;

// Auto-restore session on first import
if (!globalForTGUser.telegramUser) {
  telegramUser.restoreSession().catch(() => {});
}
