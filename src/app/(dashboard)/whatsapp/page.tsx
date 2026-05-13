"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { AlertCircle, RefreshCw, Smartphone, Unplug } from "lucide-react";
import { toast } from "sonner";

export default function WhatsAppPage() {
  const [status, setStatus] = useState("NOT_CONNECTED");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/qr");
      const data = await res.json();
      if (data.success) {
        setStatus(data.data.status);
        setQrImage(data.data.qrImage);
        setPhoneNumber(data.data.phoneNumber);
      }
    } catch {
      console.error("Failed to fetch status");
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/qr", { method: "POST" });
      const data = await res.json();
      toast.info(data.data?.message || "Initializing...");
      setTimeout(fetchStatus, 3000);
    } catch {
      toast.error("Failed to initialize WhatsApp");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await fetch("/api/whatsapp/disconnect", { method: "POST" });
      toast.success("WhatsApp disconnected");
      setStatus("NOT_CONNECTED");
      setQrImage(null);
      setPhoneNumber(null);
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<string, { color: "success" | "destructive" | "warning" | "secondary"; label: string }> = {
    CONNECTED: { color: "success", label: "Connected" },
    QR_WAITING: { color: "warning", label: "Scan QR Code" },
    DISCONNECTED: { color: "destructive", label: "Disconnected" },
    RECONNECTING: { color: "warning", label: "Reconnecting..." },
    NOT_CONNECTED: { color: "secondary", label: "Not Connected" },
  };

  const config = statusConfig[status] || statusConfig.NOT_CONNECTED;

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Connection"
        description="Connect your WhatsApp account to start sending messages"
      />

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">For opted-in business communication only</p>
              <p className="text-xs text-muted-foreground mt-1">
                This connection is for sending messages to contacts who have given explicit consent.
                Sending spam or unsolicited messages is prohibited and may result in account banning.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Connection Status
            </CardTitle>
            <CardDescription>Current WhatsApp connection state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant={config.color} className="text-sm px-3 py-1">
                {config.label}
              </Badge>
              {phoneNumber && (
                <span className="text-sm text-muted-foreground">
                  +{phoneNumber}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              {status === "NOT_CONNECTED" || status === "DISCONNECTED" ? (
                <Button onClick={handleConnect} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Connecting..." : "Connect WhatsApp"}
                </Button>
              ) : status === "CONNECTED" ? (
                <Button variant="destructive" onClick={handleDisconnect} disabled={loading}>
                  <Unplug className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              ) : null}

              {status === "CONNECTED" && (
                <Button variant="outline" onClick={fetchStatus}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
            <CardDescription>Scan with WhatsApp on your phone</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[300px]">
            {qrImage ? (
              <div className="text-center space-y-3">
                <img
                  src={qrImage}
                  alt="WhatsApp QR Code"
                  className="mx-auto rounded-lg border"
                  width={280}
                  height={280}
                />
                <p className="text-xs text-muted-foreground">
                  Open WhatsApp &gt; Settings &gt; Linked Devices &gt; Link a Device
                </p>
              </div>
            ) : status === "CONNECTED" ? (
              <div className="text-center space-y-2">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                  <Smartphone className="h-8 w-8 text-emerald-500" />
                </div>
                <p className="text-sm font-medium">WhatsApp Connected</p>
                <p className="text-xs text-muted-foreground">
                  Your account is linked and ready to send messages
                </p>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Click &quot;Connect WhatsApp&quot; to generate a QR code
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
