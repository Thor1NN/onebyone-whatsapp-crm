"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Login failed");
        return;
      }

      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-lg tracking-tight">OneByOne</h2>
              <p className="text-xs text-muted-foreground -mt-0.5">CRM Sender</p>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@onebyone.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            Forgot password? Contact your administrator.
          </p>
        </div>
      </div>

      {/* Right: Visual */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-blue-50">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-md space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium shadow-soft border">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Multi-channel messaging
            </div>
            <h2 className="text-4xl font-semibold tracking-tight leading-tight">
              Reach customers on
              <br />
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                WhatsApp & Telegram
              </span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Send personalized campaigns at scale with human-like timing,
              compliance controls, and a unified inbox.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-4">
              <div className="rounded-xl border bg-white p-4 shadow-card">
                <div className="text-2xl font-semibold text-emerald-600">15+</div>
                <div className="text-xs text-muted-foreground mt-1">Compliance features</div>
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-card">
                <div className="text-2xl font-semibold text-blue-600">2</div>
                <div className="text-xs text-muted-foreground mt-1">Messaging channels</div>
              </div>
            </div>
          </div>
        </div>
        {/* Decorative blob */}
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
      </div>
    </div>
  );
}
