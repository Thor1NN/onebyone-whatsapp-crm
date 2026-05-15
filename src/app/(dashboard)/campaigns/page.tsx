"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, Send, Eye, MessageSquare, Bot, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  minDelay: number;
  maxDelay: number;
  createdAt: string;
  startedAt: string | null;
  createdBy: { name: string };
}

const statusStyles: Record<string, "default" | "success" | "destructive" | "warning" | "secondary"> = {
  DRAFT: "secondary",
  RUNNING: "success",
  PAUSED: "warning",
  COMPLETED: "default",
  STOPPED: "destructive",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/campaigns");
        const data = await res.json();
        if (data.success) setCampaigns(data.data);
      } catch {
        toast.error("Failed to load campaigns");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
  const totalRecipients = campaigns.reduce((sum, c) => sum + c.totalRecipients, 0);
  const activeRunning = campaigns.filter((c) => c.status === "RUNNING").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Campaigns" description="Manage and monitor your messaging campaigns">
        <Link href="/campaigns/new">
          <Button>
            <Plus className="h-4 w-4 mr-1.5" />
            New Campaign
          </Button>
        </Link>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Total Campaigns</p>
            <p className="text-2xl font-semibold mt-1">{campaigns.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Active Now</p>
            <p className="text-2xl font-semibold mt-1 text-emerald-600">{activeRunning}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium">Messages Sent</p>
            <p className="text-2xl font-semibold mt-1">{totalSent.toLocaleString()} <span className="text-muted-foreground font-normal text-sm">/ {totalRecipients.toLocaleString()}</span></p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Send className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No campaigns yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Create your first campaign to start sending personalized messages
              </p>
              <Link href="/campaigns/new" className="mt-5">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1.5" /> Create campaign
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right w-[80px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => {
                  const progress = c.totalRecipients > 0
                    ? Math.round((c.sentCount / c.totalRecipients) * 100)
                    : 0;

                  return (
                    <TableRow key={c.id} className="group">
                      <TableCell>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">by {c.createdBy.name}</p>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.channel === "telegram" ? "text-blue-600" : "text-emerald-600"}`}>
                          {c.channel === "telegram" ? <Bot className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                          {c.channel === "telegram" ? "Telegram" : "WhatsApp"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusStyles[c.status]}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-medium">
                            {c.sentCount} <span className="text-muted-foreground">/ {c.totalRecipients}</span>
                          </span>
                          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${c.failedCount > 0 ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/campaigns/${c.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-foreground">
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
