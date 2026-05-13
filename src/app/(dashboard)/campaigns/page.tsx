"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, Send, Eye, MessageSquare, Bot } from "lucide-react";
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

const statusColors: Record<string, "default" | "success" | "destructive" | "warning" | "secondary"> = {
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

  return (
    <div className="space-y-6">
      <PageHeader title="Campaigns" description="Manage your messaging campaigns">
        <Link href="/campaigns/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Send className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No campaigns yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Create your first campaign to start messaging</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Delay Range</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <span className={`flex items-center gap-1 text-xs ${c.channel === "telegram" ? "text-blue-500" : "text-emerald-500"}`}>
                        {c.channel === "telegram" ? <Bot className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                        {c.channel === "telegram" ? "TG" : "WA"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[c.status]}>{c.status}</Badge>
                    </TableCell>
                    <TableCell>{c.totalRecipients}</TableCell>
                    <TableCell className="text-emerald-500">{c.sentCount}</TableCell>
                    <TableCell className="text-destructive">{c.failedCount}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.minDelay}s – {c.maxDelay}s
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/campaigns/${c.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
