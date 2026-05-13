"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  Users,
  CheckCircle,
  ShieldBan,
  Send,
  AlertCircle,
  Clock,
  Smartphone,
  MessageSquare,
} from "lucide-react";

interface Stats {
  totalContacts: number;
  optedInContacts: number;
  blacklistedContacts: number;
  activeCampaigns: number;
  sentToday: number;
  failedToday: number;
  whatsappStatus: string;
  recentLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    user: { name: string };
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [contactsRes, campaignsRes, waRes, logsRes] = await Promise.all([
          fetch("/api/contacts?limit=1"),
          fetch("/api/campaigns"),
          fetch("/api/whatsapp/status"),
          fetch("/api/audit-logs?limit=5"),
        ]);

        const contactsData = await contactsRes.json();
        const campaignsData = await campaignsRes.json();
        const waData = await waRes.json();
        const logsData = await logsRes.json();

        const campaigns = campaignsData.data || [];
        const activeCampaigns = campaigns.filter(
          (c: { status: string }) => c.status === "RUNNING"
        ).length;

        setStats({
          totalContacts: contactsData.data?.pagination?.total || 0,
          optedInContacts: 0,
          blacklistedContacts: 0,
          activeCampaigns,
          sentToday: 0,
          failedToday: 0,
          whatsappStatus: waData.data?.status || "NOT_CONNECTED",
          recentLogs: logsData.data?.logs || [],
        });
      } catch {
        console.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const statusColor: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
    CONNECTED: "success",
    QR_WAITING: "warning",
    DISCONNECTED: "destructive",
    RECONNECTING: "warning",
    NOT_CONNECTED: "secondary",
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of your WhatsApp CRM" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WhatsApp</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={statusColor[stats?.whatsappStatus || "NOT_CONNECTED"]}>
              {stats?.whatsappStatus?.replace("_", " ")}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalContacts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opted-In</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.optedInContacts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blacklisted</CardTitle>
            <ShieldBan className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.blacklistedContacts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeCampaigns || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
            <MessageSquare className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.sentToday || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Today</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.failedToday || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">messages waiting</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentLogs?.length ? (
            <div className="space-y-3">
              {stats.recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span>{log.action.replace(/_/g, " ").toLowerCase()}</span>
                    <span className="text-muted-foreground">by {log.user.name}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Compliance Reminder</p>
              <p className="text-xs text-muted-foreground mt-1">
                Only send WhatsApp messages to people who gave explicit permission to be contacted.
                Do not send spam or unsolicited promotions. Violations may result in your WhatsApp
                account being banned.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
