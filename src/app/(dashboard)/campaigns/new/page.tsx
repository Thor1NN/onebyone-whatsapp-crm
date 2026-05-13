"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, Send, MessageSquare, Bot } from "lucide-react";
import { toast } from "sonner";
import { formatDelay, estimateCampaignDuration } from "@/lib/utils";

interface Contact {
  id: string;
  name: string | null;
  phoneNumber: string;
  telegramChatId: string | null;
  optInStatus: boolean;
  isBlacklisted: boolean;
}

interface Template {
  id: string;
  name: string;
  body: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    channel: "whatsapp" as "whatsapp" | "telegram",
    messageBody: "",
    minDelay: 30,
    maxDelay: 2700,
    dailyLimit: 100,
    businessHoursOnly: false,
    businessHourStart: "10:00",
    businessHourEnd: "19:00",
    lunchBreakStart: "",
    lunchBreakEnd: "",
    adminOverride: false,
  });

  useEffect(() => {
    async function load() {
      const [cRes, tRes] = await Promise.all([
        fetch("/api/contacts?limit=500"),
        fetch("/api/templates"),
      ]);
      const cData = await cRes.json();
      const tData = await tRes.json();
      if (cData.success) setContacts(cData.data.contacts);
      if (tData.success) setTemplates(tData.data);
    }
    load();
  }, []);

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const eligible = contacts.filter((c) => !c.isBlacklisted && (c.optInStatus || form.adminOverride));
    setSelectedContacts(eligible.map((c) => c.id));
  };

  const estimatedDuration = estimateCampaignDuration(
    selectedContacts.length,
    form.minDelay,
    form.maxDelay
  );

  const handleSubmit = async () => {
    if (!form.name) { toast.error("Campaign name is required"); return; }
    if (!form.messageBody) { toast.error("Message body is required"); return; }
    if (selectedContacts.length === 0) { toast.error("Select at least one contact"); return; }
    if (form.minDelay >= form.maxDelay) { toast.error("Min delay must be less than max delay"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          contactIds: selectedContacts,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success("Campaign created");
      router.push(`/campaigns/${data.data.id}`);
    } catch {
      toast.error("Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

  const previewMessage = form.messageBody
    .replace(/\{\{name\}\}/gi, "John")
    .replace(/\{\{phone\}\}/gi, "+1234567890")
    .replace(/\{\{company\}\}/gi, "Acme Inc")
    .replace(/\{\{custom_1\}\}/gi, "value");

  return (
    <div className="space-y-6">
      <PageHeader title="New Campaign" description="Create a new messaging campaign" />

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <p className="text-sm">
              Only send messages to people who gave permission to be contacted.
              Do not send spam or unsolicited promotions.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Campaign Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Channel *</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setForm({ ...form, channel: "whatsapp" }); setSelectedContacts([]); }}
                    className={`flex items-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                      form.channel === "whatsapp"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <MessageSquare className="h-5 w-5" />
                    WhatsApp
                    {form.channel === "whatsapp" && <Badge variant="success" className="ml-1 text-[10px]">Selected</Badge>}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForm({ ...form, channel: "telegram" }); setSelectedContacts([]); }}
                    className={`flex items-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                      form.channel === "telegram"
                        ? "border-blue-500 bg-blue-500/10 text-blue-500"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <Bot className="h-5 w-5" />
                    Telegram
                    {form.channel === "telegram" && <Badge variant="default" className="ml-1 text-[10px] bg-blue-500">Selected</Badge>}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Welcome campaign" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Message Body *</Label>
                  <span className="text-xs text-muted-foreground">{form.messageBody.length} chars</span>
                </div>
                <Textarea
                  rows={5}
                  value={form.messageBody}
                  onChange={(e) => setForm({ ...form, messageBody: e.target.value })}
                  placeholder="Hi {{name}}, ..."
                />
                <div className="flex gap-2 flex-wrap">
                  {["{{name}}", "{{phone}}", "{{company}}", "{{custom_1}}"].map((v) => (
                    <Button key={v} variant="outline" size="sm" className="text-xs h-7"
                      onClick={() => setForm({ ...form, messageBody: form.messageBody + v })}>
                      {v}
                    </Button>
                  ))}
                </div>
                {templates.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    <span className="text-xs text-muted-foreground">Load template:</span>
                    {templates.map((t) => (
                      <Button key={t.id} variant="secondary" size="sm" className="text-xs h-7"
                        onClick={() => setForm({ ...form, messageBody: t.body })}>
                        {t.name}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              {form.messageBody && (
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-4 text-sm whitespace-pre-wrap">
                  {previewMessage}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Delay Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Delay (seconds)</Label>
                  <Input type="number" min={10} max={3600} value={form.minDelay}
                    onChange={(e) => setForm({ ...form, minDelay: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">{formatDelay(form.minDelay)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Max Delay (seconds)</Label>
                  <Input type="number" min={30} max={7200} value={form.maxDelay}
                    onChange={(e) => setForm({ ...form, maxDelay: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">{formatDelay(form.maxDelay)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Daily Sending Limit</Label>
                <Input type="number" min={1} max={1000} value={form.dailyLimit}
                  onChange={(e) => setForm({ ...form, dailyLimit: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.businessHoursOnly}
                  onCheckedChange={(v) => setForm({ ...form, businessHoursOnly: v })} />
                <Label>Business hours only</Label>
              </div>
              {form.businessHoursOnly && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={form.businessHourStart}
                      onChange={(e) => setForm({ ...form, businessHourStart: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" value={form.businessHourEnd}
                      onChange={(e) => setForm({ ...form, businessHourEnd: e.target.value })} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lunch Break Start (optional)</Label>
                  <Input type="time" value={form.lunchBreakStart}
                    onChange={(e) => setForm({ ...form, lunchBreakStart: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Lunch Break End (optional)</Label>
                  <Input type="time" value={form.lunchBreakEnd}
                    onChange={(e) => setForm({ ...form, lunchBreakEnd: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Select Contacts ({selectedContacts.length})</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>Select All Eligible</Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedContacts([])}>Clear</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <Switch checked={form.adminOverride}
                  onCheckedChange={(v) => setForm({ ...form, adminOverride: v })} />
                <Label className="text-sm">Include contacts without opt-in (admin override)</Label>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2">
                {contacts.map((c) => {
                  const noTelegram = form.channel === "telegram" && !c.telegramChatId;
                  const disabled = c.isBlacklisted || (!c.optInStatus && !form.adminOverride) || noTelegram;
                  return (
                    <label key={c.id} className={`flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer ${disabled ? "opacity-40" : ""}`}>
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(c.id)}
                        onChange={() => !disabled && toggleContact(c.id)}
                        disabled={disabled}
                        className="rounded"
                      />
                      <span className="text-sm">{c.name || c.phoneNumber}</span>
                      <span className="text-xs text-muted-foreground">{c.phoneNumber}</span>
                      {c.isBlacklisted && <span className="text-xs text-destructive">Blacklisted</span>}
                      {!c.optInStatus && !c.isBlacklisted && <span className="text-xs text-amber-500">No opt-in</span>}
                      {noTelegram && <span className="text-xs text-blue-400">No Telegram</span>}
                      {form.channel === "telegram" && c.telegramChatId && <span className="text-xs text-blue-500">TG linked</span>}
                    </label>
                  );
                })}
                {contacts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No contacts available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader><CardTitle className="text-base">Campaign Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Channel</span>
                <span className={`font-medium flex items-center gap-1 ${form.channel === "telegram" ? "text-blue-500" : "text-emerald-500"}`}>
                  {form.channel === "telegram" ? <Bot className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                  {form.channel === "telegram" ? "Telegram" : "WhatsApp"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recipients</span>
                <span className="font-medium">{selectedContacts.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delay Range</span>
                <span className="font-medium">{formatDelay(form.minDelay)} – {formatDelay(form.maxDelay)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Daily Limit</span>
                <span className="font-medium">{form.dailyLimit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Est. Duration</span>
                <span className="font-medium flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDelay(estimatedDuration)}
                </span>
              </div>
              {form.businessHoursOnly && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hours</span>
                  <span className="font-medium">{form.businessHourStart} – {form.businessHourEnd}</span>
                </div>
              )}

              <div className="pt-4 border-t">
                <Button className="w-full" size="lg" onClick={handleSubmit} disabled={loading}>
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? "Creating..." : "Create Campaign"}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  Campaign will be created as a draft. You can launch it from the campaign detail page.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
