import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "OPERATOR"]).default("OPERATOR"),
});

export const contactSchema = z.object({
  name: z.string().optional(),
  phoneNumber: z.string().min(7, "Phone number is required"),
  countryCode: z.string().optional(),
  company: z.string().optional(),
  custom1: z.string().optional(),
  notes: z.string().optional(),
  optInStatus: z.boolean().default(false),
  optInSource: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  body: z.string().min(1, "Template body is required"),
  category: z.string().optional(),
});

export const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  channel: z.string().default("whatsapp"),
  messageBody: z.string().min(1, "Message body is required"),
  templateId: z.string().optional(),
  attachmentUrl: z.string().optional(),
  attachmentType: z.string().optional(),
  contactIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  minDelay: z.number().min(10).max(3600).default(30),
  maxDelay: z.number().min(30).max(7200).default(2700),
  dailyLimit: z.number().min(1).max(1000).default(100),
  businessHoursOnly: z.boolean().default(false),
  businessHourStart: z.string().optional(),
  businessHourEnd: z.string().optional(),
  lunchBreakStart: z.string().optional(),
  lunchBreakEnd: z.string().optional(),
  adminOverride: z.boolean().default(false),
  scheduledStart: z.string().optional(),
});

export const settingsSchema = z.object({
  defaultCountryCode: z.string().optional(),
  defaultMinDelay: z.number().optional(),
  defaultMaxDelay: z.number().optional(),
  businessHourStart: z.string().optional(),
  businessHourEnd: z.string().optional(),
  dailySendingLimit: z.number().optional(),
  optOutKeywords: z.array(z.string()).optional(),
});

export function normalizePhoneNumber(
  phone: string,
  defaultCountryCode?: string
): string {
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  if (cleaned.startsWith("00")) {
    return "+" + cleaned.slice(2);
  }
  if (defaultCountryCode) {
    const code = defaultCountryCode.startsWith("+")
      ? defaultCountryCode
      : "+" + defaultCountryCode;
    return code + cleaned;
  }
  return "+" + cleaned;
}

export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)\.+]/g, "");
  return /^\d{7,15}$/.test(cleaned);
}

export function personalizeMessage(
  template: string,
  contact: {
    name?: string | null;
    phoneNumber: string;
    company?: string | null;
    custom1?: string | null;
  }
): string {
  return template
    .replace(/\{\{name\}\}/gi, contact.name || "")
    .replace(/\{\{phone\}\}/gi, contact.phoneNumber)
    .replace(/\{\{company\}\}/gi, contact.company || "")
    .replace(/\{\{custom_1\}\}/gi, contact.custom1 || "");
}

const OPT_OUT_KEYWORDS = [
  "stop",
  "unsubscribe",
  "cancel",
  "remove me",
  "no more messages",
  "opt out",
  "opt-out",
];

export function isOptOutMessage(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return OPT_OUT_KEYWORDS.some(
    (keyword) => lower === keyword || lower.includes(keyword)
  );
}
