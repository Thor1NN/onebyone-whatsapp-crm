"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Bot,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface Stats {
  totalContacts: number;
  optedInContacts: number;
  blacklistedContacts: number;
  activeCampaigns: number;
  sentToday: number;
  failedToday: number;
  whatsappStatus: string;
  telegramStatus: string;
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
        const [contactsRes, campaignsRes, waRes, tgRes, logsRes] = await Promise.all([
          fetch("/api/contacts?limit=1"),
          fetch("/api/campaigns"),
          fetch("/api/whatsapp/status"),
          fetch("/api/telegram/status"),
          fetch("/api/audit-logs?limit=5"),
        ]);

        const contactsData = await contactsRes.json();
        const campaignsData = await campaignsRes.json();
        const waData = await waRes.json();
        const tgData = await tgRes.json();
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
          telegramStatus: tgData.data?.status || "NOT_CONNECTED",
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isWAConnected = stats?.whatsappStatus === "CONNECTED";
  const isTGConnected = stats?.telegramStatus === "CONNECTED";

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Welcome back — here's what's happening today" >
        <Link href="/campaigns/new">
          <Button>
            <Send className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </PageHeader>

      {/* Channel status cards — prominent at the top */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/whatsapp">
          <Card className="hover:shadow-card transition-shadow group cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isWAConnected ? "bg-emerald-50" : "bg-zinc-100"}`}>
                <Smartphone className={`h-6 w-6 ${isWAConnected ? "text-emerald-600" : "text-zinc-400"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">WhatsApp</p>
                  <span className={`h-2 w-2 rounded-full ${isWAConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-300"}`} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isWAConnected ? "Connected and ready to send" : "Click to connect via QR code"}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/telegram">
          <Card className="hover:shadow-card transition-shadow group cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isTGConnected ? "bg-blue-50" : "bg-zinc-100"}`}>
                <Bot className={`h-6 w-6 ${isTGConnected ? "text-blue-600" : "text-zinc-400"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Telegram</p>
                  <span className={`h-2 w-2 rounded-full ${isTGConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-300"}`} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isTGConnected ? "Bot active and listening" : "Click to add your bot token"}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">Overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Contacts" value={stats?.totalContacts || 0} icon={Users} />
          <StatCard label="Active Campaigns" value={stats?.activeCampaigns || 0} icon={Send} accent={stats?.activeCampaigns ? "text-emerald-600" : ""} />
          <StatCard label="Sent Today" value={stats?.sentToday || 0} icon={TrendingUp} accent="text-emerald-600" />
          <StatCard label="Blacklisted" value={stats?.blacklistedContacts || 0} icon={ShieldBan} />
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Recent Activity</h2>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            {stats?.recentLogs?.length ? (
              <div className="space-y-1">
                {stats.recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2.5 text-sm border-b last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="font-medium truncate">{log.action.replace(/_/g, " ").toLowerCase()}</span>
                      <span className="text-muted-foreground text-xs">by {log.user.name}</span>
                    </div>
                    <span className="text-muted-foreground text-xs flex-shrink-0 ml-2">
                      {new Date(log.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No activity yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/60">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
              <h2 className="font-semibold">Compliance</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Only send messages to people who gave explicit permission. Spam or unsolicited promotions may result in account bans.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className={`text-2xl font-semibold tracking-tight ${accent || ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
