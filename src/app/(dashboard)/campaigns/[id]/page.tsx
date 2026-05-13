"use client";

import { useEffect, useState, useCallback, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { Play, Pause, Square, AlertCircle, Download, MessageSquare, Bot } from "lucide-react";
import { toast } from "sonner";
import { formatDelay } from "@/lib/utils";

interface Recipient {
  id: string;
  status: string;
  sentAt: string | null;
  delayUsed: number | null;
  errorMessage: string | null;
  retryCount: number;
  contact: {
    name: string | null;
    phoneNumber: string;
  };
}

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  messageBody: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  minDelay: number;
  maxDelay: number;
  dailyLimit: number;
  businessHoursOnly: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  createdBy: { name: string };
  recipients: Recipient[];
}

const statusColors: Record<string, "default" | "success" | "destructive" | "warning" | "secondary"> = {
  DRAFT: "secondary",
  RUNNING: "success",
  PAUSED: "warning",
  COMPLETED: "default",
  STOPPED: "destructive",
  PENDING: "secondary",
  WAITING: "warning",
  SENDING: "warning",
  SENT: "success",
  FAILED: "destructive",
  SKIPPED: "secondary",
  CANCELLED: "destructive",
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      if (data.success) setCampaign(data.data);
    } catch {
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCampaign();
    const interval = setInterval(fetchCampaign, 10000);
    return () => clearInterval(interval);
  }, [fetchCampaign]);

  const handleAction = async (action: "start" | "pause" | "stop") => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/${action}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success(`Campaign ${action}ed`);
      setShowConfirm(false);
      fetchCampaign();
    } catch {
      toast.error(`Failed to ${action} campaign`);
    } finally {
      setActionLoading(false);
    }
  };

  const exportCSV = () => {
    if (!campaign) return;
    const headers = ["Name", "Phone", "Status", "Sent At", "Delay", "Error"];
    const rows = campaign.recipients.map((r) => [
      r.contact.name || "",
      r.contact.phoneNumber,
      r.status,
      r.sentAt || "",
      r.delayUsed ? `${r.delayUsed}s` : "",
      r.errorMessage || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-${campaign.name}-report.csv`;
    a.click();
  };

  if (loading || !campaign) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const pendingCount = campaign.totalRecipients - campaign.sentCount - campaign.failedCount - campaign.skippedCount;
  const progress = campaign.totalRecipients > 0
    ? Math.round((campaign.sentCount / campaign.totalRecipients) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader title={campaign.name}>
        <div className="flex gap-2">
          {(campaign.status === "DRAFT" || campaign.status === "PAUSED") && (
            <>
              {!showConfirm ? (
                <Button onClick={() => setShowConfirm(true)}>
                  <Play className="h-4 w-4 mr-2" />
                  {campaign.status === "DRAFT" ? "Launch Campaign" : "Resume"}
                </Button>
              ) : (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Confirm launch?</span>
                  <Button size="sm" onClick={() => handleAction("start")} disabled={actionLoading}>
                    Yes, Launch
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </>
          )}
          {campaign.status === "RUNNING" && (
            <>
              <Button variant="outline" onClick={() => handleAction("pause")} disabled={actionLoading}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button variant="destructive" onClick={() => handleAction("stop")} disabled={actionLoading}>
                <Square className="h-4 w-4 mr-2" />
                Emergency Stop
              </Button>
            </>
          )}
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{campaign.totalRecipients}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-emerald-500">{campaign.sentCount}</p>
            <p className="text-xs text-muted-foreground">Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-destructive">{campaign.failedCount}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{campaign.skippedCount}</p>
            <p className="text-xs text-muted-foreground">Skipped</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <Badge variant={statusColors[campaign.status]} className="text-sm px-3 py-1">{campaign.status}</Badge>
            <Badge variant="secondary" className={`text-sm px-3 py-1 flex items-center gap-1 ${campaign.channel === "telegram" ? "text-blue-500" : "text-emerald-500"}`}>
              {campaign.channel === "telegram" ? <Bot className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
              {campaign.channel === "telegram" ? "Telegram" : "WhatsApp"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Delay: {formatDelay(campaign.minDelay)} – {formatDelay(campaign.maxDelay)}
            </span>
            <span className="text-sm text-muted-foreground">
              Limit: {campaign.dailyLimit}/day
            </span>
            <span className="text-sm text-muted-foreground">
              By: {campaign.createdBy.name}
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recipients</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Delay</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaign.recipients.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.contact.name || "—"}</TableCell>
                  <TableCell>{r.contact.phoneNumber}</TableCell>
                  <TableCell><Badge variant={statusColors[r.status]}>{r.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.sentAt ? new Date(r.sentAt).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{r.delayUsed ? formatDelay(r.delayUsed) : "—"}</TableCell>
                  <TableCell>{r.retryCount}</TableCell>
                  <TableCell className="text-xs text-destructive max-w-[200px] truncate">{r.errorMessage || ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
