import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function formatDelay(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function estimateCampaignDuration(
  recipientCount: number,
  minDelay: number,
  maxDelay: number
): number {
  const avgDelay = (minDelay + maxDelay) / 2;
  return Math.ceil(recipientCount * avgDelay);
}

export function isWithinBusinessHours(
  start: string,
  end: string,
  now?: Date
): boolean {
  const current = now || new Date();
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const currentMinutes = current.getHours() * 60 + current.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

export function isInLunchBreak(
  start: string | null,
  end: string | null,
  now?: Date
): boolean {
  if (!start || !end) return false;
  const current = now || new Date();
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const currentMinutes = current.getHours() * 60 + current.getMinutes();
  return (
    currentMinutes >= startH * 60 + startM &&
    currentMinutes <= endH * 60 + endM
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
