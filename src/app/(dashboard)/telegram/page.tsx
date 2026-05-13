"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { AlertCircle, Bot, RefreshCw, Unplug, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function TelegramPage() {
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
    } catch {
      console.error("Failed to fetch Telegram status");
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
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
      toast.error("Failed to connect Telegram bot");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await fetch("/api/telegram/disconnect", { method: "POST" });
      toast.success("Telegram bot disconnected");
      setStatus("NOT_CONNECTED");
      setBotUsername(null);
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<string, { color: "success" | "destructive" | "warning" | "secondary"; label: string }> = {
    CONNECTED: { color: "success", label: "Connected" },
    DISCONNECTED: { color: "destructive", label: "Disconnected" },
    ERROR: { color: "destructive", label: "Error" },
    NOT_CONNECTED: { color: "secondary", label: "Not Connected" },
  };

  const config = statusConfig[status] || statusConfig.NOT_CONNECTED;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Telegram Connection"
        description="Connect your Telegram bot to send automated messages"
      />

      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">How to create a Telegram bot</p>
              <ol className="text-xs text-muted-foreground mt-1 space-y-1 list-decimal list-inside">
                <li>Open Telegram and search for <strong>@BotFather</strong></li>
                <li>Send <code>/newbot</code> and follow the instructions</li>
                <li>Copy the bot token and paste it below</li>
                <li>Users must message your bot first before you can send them messages</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Connection Status
            </CardTitle>
            <CardDescription>Current Telegram bot connection state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant={config.color} className="text-sm px-3 py-1">
                {config.label}
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

            <div className="flex gap-2">
              {status === "CONNECTED" ? (
                <>
                  <Button variant="destructive" onClick={handleDisconnect} disabled={loading}>
                    <Unplug className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                  <Button variant="outline" onClick={fetchStatus}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bot Token</CardTitle>
            <CardDescription>
              {status === "CONNECTED"
                ? "Your bot is connected and receiving messages"
                : "Enter your Telegram bot token to connect"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "CONNECTED" ? (
              <div className="text-center space-y-3 py-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
                  <Bot className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-sm font-medium">Telegram Bot Active</p>
                <p className="text-xs text-muted-foreground">
                  Your bot is listening for incoming messages and ready to send campaigns
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Bot Token</Label>
                  <Input
                    type="password"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                    onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                  />
                  <p className="text-xs text-muted-foreground">
                    Get this from @BotFather on Telegram
                  </p>
                </div>
                <Button onClick={handleConnect} disabled={loading} className="w-full">
                  <Bot className={`h-4 w-4 mr-2 ${loading ? "animate-pulse" : ""}`} />
                  {loading ? "Connecting..." : "Connect Bot"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {status === "CONNECTED" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linking Contacts to Telegram</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                When someone messages your bot, they are automatically added as a contact with their Telegram chat ID.
                You can then include them in Telegram campaigns.
              </p>
              <p>
                To link an existing contact, have them message your bot. The system will match them or create a new contact entry.
              </p>
              <div className="rounded-lg bg-muted/50 p-3 mt-2">
                <p className="text-xs font-mono">
                  Bot link: <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">https://t.me/{botUsername}</a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
