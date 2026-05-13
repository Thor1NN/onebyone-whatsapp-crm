"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import {
  AlertCircle,
  Bot,
  RefreshCw,
  Unplug,
  ExternalLink,
  User,
  Users,
  Download,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

interface Group {
  id: string;
  title: string;
  type: string;
  membersCount: number;
}

export default function TelegramPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Telegram"
        description="Connect a bot for sending or a user account for extracting group members"
      />

      <Tabs defaultValue="bot" className="space-y-6">
        <TabsList className="grid w-fit grid-cols-2">
          <TabsTrigger value="bot">
            <Bot className="h-4 w-4 mr-2" />
            Bot (for sending)
          </TabsTrigger>
          <TabsTrigger value="user">
            <User className="h-4 w-4 mr-2" />
            User Account (for extracting)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bot">
          <BotTab />
        </TabsContent>

        <TabsContent value="user">
          <UserTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =====================================================
// BOT TAB
// =====================================================
function BotTab() {
  const [status, setStatus] = useState("NOT_CONNECTED");
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [botToken, setBotToken] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/telegram/status");
      const data = await res.json();
      if (data.success) {
        setStatus(data.data.status);
        setBotUsername(data.data.botUsername);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleConnect = async () => {
    if (!botToken.trim()) {
      toast.error("Please enter a bot token");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to connect");
        return;
      }
      toast.success(`Connected as @${data.data.botUsername}`);
      setBotToken("");
      fetchStatus();
    } catch {
      toast.error("Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await fetch("/api/telegram/disconnect", { method: "POST" });
      toast.success("Bot disconnected");
      setStatus("NOT_CONNECTED");
      setBotUsername(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Bot Status
          </CardTitle>
          <CardDescription>For sending messages and receiving replies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant={status === "CONNECTED" ? "success" : "secondary"} className="text-sm px-3 py-1">
              {status === "CONNECTED" ? "Connected" : "Not Connected"}
            </Badge>
            {botUsername && (
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-500 hover:underline"
              >
                @{botUsername}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {status === "CONNECTED" ? (
            <Button variant="destructive" onClick={handleDisconnect} disabled={loading}>
              <Unplug className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Bot Token</Label>
                <Input
                  type="password"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="123456789:ABCdefGHI..."
                />
              </div>
              <Button onClick={handleConnect} disabled={loading} className="w-full">
                {loading ? "Connecting..." : "Connect Bot"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-500/30 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium">How to create a bot</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Open Telegram, message <strong>@BotFather</strong></li>
                <li>Send <code>/newbot</code>, follow instructions</li>
                <li>Copy the token, paste here</li>
              </ol>
              <p className="text-xs text-muted-foreground pt-2 border-t mt-2">
                <strong>Limitation:</strong> Bots can only message users who messaged the bot first.
                For mass outreach, use the User Account tab.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================
// USER ACCOUNT TAB (for extracting group members)
// =====================================================
function UserTab() {
  const [status, setStatus] = useState("NOT_CONNECTED");
  const [username, setUsername] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auth form state
  const [apiId, setApiId] = useState("");
  const [apiHash, setApiHash] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  // Groups
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [extractingId, setExtractingId] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/telegram/user/status");
      const data = await res.json();
      if (data.success) {
        setStatus(data.data.status);
        setUsername(data.data.username);
        setFirstName(data.data.firstName);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleStartAuth = async () => {
    if (!apiId || !apiHash || !phoneNumber) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/user/auth-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiId, apiHash, phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed");
        return;
      }
      toast.success("Code sent — check Telegram app");
      fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!code) {
      toast.error("Enter the code from Telegram");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/user/auth-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed");
        return;
      }
      setCode("");
      fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPassword = async () => {
    if (!password) return;
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/user/auth-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed");
        return;
      }
      setPassword("");
      fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await fetch("/api/telegram/user/disconnect", { method: "POST" });
      toast.success("Disconnected");
      setGroups([]);
      fetchStatus();
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch("/api/telegram/user/groups");
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load groups");
        return;
      }
      setGroups(data.data);
      toast.success(`Found ${data.data.length} groups`);
    } finally {
      setLoadingGroups(false);
    }
  };

  const extractMembers = async (groupId: string, groupTitle: string) => {
    setExtractingId(groupId);
    try {
      const res = await fetch("/api/telegram/user/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, groupTitle }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed");
        return;
      }
      toast.success(data.data.message);
    } finally {
      setExtractingId(null);
    }
  };

  // STATE: Connected — show groups
  if (status === "CONNECTED") {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">{firstName || "Telegram User"}</p>
                <p className="text-xs text-muted-foreground">@{username || "—"}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleDisconnect} disabled={loading}>
              <Unplug className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Compliance Notice</p>
                <p className="text-xs text-muted-foreground">
                  Extracted members are saved with <strong>opt-in disabled</strong>. They did not consent to receive your messages.
                  Telegram may ban accounts that mass-message unsolicited users. Use this responsibly — only message people who already know your business.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Your Groups & Channels</CardTitle>
              <CardDescription>Extract members from groups you're part of</CardDescription>
            </div>
            <Button onClick={loadGroups} disabled={loadingGroups} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingGroups ? "animate-spin" : ""}`} />
              {groups.length === 0 ? "Load Groups" : "Refresh"}
            </Button>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click "Load Groups" to see all groups and channels you're in
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-blue-600 font-medium text-sm">
                        {g.title[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{g.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {g.membersCount > 0 ? `~${g.membersCount} members` : "Unknown size"} · {g.type}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => extractMembers(g.id, g.title)}
                      disabled={extractingId === g.id}
                    >
                      <Download className={`h-3.5 w-3.5 mr-1.5 ${extractingId === g.id ? "animate-pulse" : ""}`} />
                      {extractingId === g.id ? "Extracting..." : "Extract"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // STATE: Awaiting code
  if (status === "AWAITING_CODE") {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Enter verification code</CardTitle>
          <CardDescription>
            Telegram sent a code to your app. Check the message from Telegram itself.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="12345"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmitCode()}
            className="text-center text-lg font-mono tracking-widest h-12"
            maxLength={6}
            autoFocus
          />
          <Button onClick={handleSubmitCode} disabled={loading} className="w-full">
            {loading ? "Verifying..." : "Verify"}
          </Button>
          <Button variant="ghost" onClick={handleDisconnect} className="w-full text-xs">
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  // STATE: Awaiting 2FA password
  if (status === "AWAITING_PASSWORD") {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Two-step verification</CardTitle>
          <CardDescription>Enter your Telegram cloud password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            placeholder="••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmitPassword()}
            autoFocus
          />
          <Button onClick={handleSubmitPassword} disabled={loading} className="w-full">
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // STATE: Initial — show setup form
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Connect Telegram Account</CardTitle>
          <CardDescription>Sign in with your phone to extract group members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API ID</Label>
            <Input
              type="text"
              placeholder="1234567"
              value={apiId}
              onChange={(e) => setApiId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>API Hash</Label>
            <Input
              type="password"
              placeholder="abc123def456..."
              value={apiHash}
              onChange={(e) => setApiHash(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone Number (with country code)</Label>
            <Input
              type="tel"
              placeholder="+971501234567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          <Button onClick={handleStartAuth} disabled={loading} className="w-full">
            {loading ? "Sending code..." : "Send Verification Code"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">How to get API credentials</p>
              <ol className="text-xs text-muted-foreground mt-1 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://my.telegram.org/auth" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">my.telegram.org/auth</a></li>
                <li>Log in with your phone number</li>
                <li>Click <strong>"API development tools"</strong></li>
                <li>Fill out the form (any name/description)</li>
                <li>Copy <strong>App api_id</strong> and <strong>App api_hash</strong></li>
                <li>Paste them here</li>
              </ol>
            </div>
          </div>
          <div className="rounded-lg bg-white/60 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Privacy:</strong> Your credentials are stored locally on this server only. They are never shared.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
