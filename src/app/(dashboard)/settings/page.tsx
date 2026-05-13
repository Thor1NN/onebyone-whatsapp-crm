"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { Save } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    defaultCountryCode: "+1",
    defaultMinDelay: "30",
    defaultMaxDelay: "2700",
    businessHourStart: "10:00",
    businessHourEnd: "19:00",
    dailySendingLimit: "100",
    optOutKeywords: "stop,unsubscribe,cancel,remove me,no more messages,opt out,opt-out",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (data.success && data.data) {
          setSettings((prev) => ({ ...prev, ...data.data }));
        }
      } catch {
        // defaults are fine
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) toast.success("Settings saved");
      else toast.error("Failed to save");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure default values and preferences">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Country Code</Label>
              <Input value={settings.defaultCountryCode} onChange={(e) => setSettings({ ...settings, defaultCountryCode: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Daily Sending Limit</Label>
              <Input type="number" value={settings.dailySendingLimit} onChange={(e) => setSettings({ ...settings, dailySendingLimit: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Default Delay Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Min Delay (seconds)</Label>
              <Input type="number" value={settings.defaultMinDelay} onChange={(e) => setSettings({ ...settings, defaultMinDelay: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Default Max Delay (seconds)</Label>
              <Input type="number" value={settings.defaultMaxDelay} onChange={(e) => setSettings({ ...settings, defaultMaxDelay: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={settings.businessHourStart} onChange={(e) => setSettings({ ...settings, businessHourStart: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={settings.businessHourEnd} onChange={(e) => setSettings({ ...settings, businessHourEnd: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opt-Out Keywords</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Keywords (comma separated)</Label>
              <Input value={settings.optOutKeywords} onChange={(e) => setSettings({ ...settings, optOutKeywords: e.target.value })} />
              <p className="text-xs text-muted-foreground">
                When a contact replies with any of these words, they will be automatically blacklisted.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
