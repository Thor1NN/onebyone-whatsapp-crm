import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { normalizePhoneNumber, isValidPhoneNumber } from "@/lib/validators";
import { success, error, unauthorized } from "@/lib/api-response";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const user = authenticateRequest(req);
  if (!user) return unauthorized();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const defaultCountryCode = formData.get("countryCode") as string | null;

    if (!file) return error("No file uploaded");

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

    let created = 0;
    let skipped = 0;
    let invalid = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const phoneRaw =
        row.phone_number || row.phone || row.phoneNumber || row.Phone || "";
      if (!phoneRaw) {
        invalid++;
        continue;
      }

      const countryCode =
        row.country_code || row.countryCode || defaultCountryCode || "";
      const phone = normalizePhoneNumber(phoneRaw, countryCode);

      if (!isValidPhoneNumber(phone)) {
        invalid++;
        errors.push(`Invalid: ${phoneRaw}`);
        continue;
      }

      const existing = await prisma.contact.findUnique({
        where: { phoneNumber: phone },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const optInRaw = row.opt_in_status || row.optInStatus || row.opt_in || "";
      const optIn =
        optInRaw === "true" ||
        optInRaw === "1" ||
        optInRaw === "yes" ||
        optInRaw === "TRUE";

      await prisma.contact.create({
        data: {
          name: row.name || row.Name || null,
          phoneNumber: phone,
          countryCode: countryCode || null,
          company: row.company || row.Company || null,
          custom1: row.custom_1 || row.custom1 || null,
          notes: row.notes || row.Notes || null,
          optInStatus: optIn,
          optInSource: "CSV Upload",
          optInDate: optIn ? new Date() : null,
        },
      });

      if (row.tags || row.Tags) {
        const tagNames = (row.tags || row.Tags || "")
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean);

        for (const tagName of tagNames) {
          const tag = await prisma.tag.upsert({
            where: { name: tagName.toLowerCase() },
            update: {},
            create: { name: tagName.toLowerCase() },
          });

          const contact = await prisma.contact.findUnique({
            where: { phoneNumber: phone },
          });
          if (contact) {
            await prisma.contactTag.upsert({
              where: {
                contactId_tagId: { contactId: contact.id, tagId: tag.id },
              },
              update: {},
              create: { contactId: contact.id, tagId: tag.id },
            });
          }
        }
      }

      created++;
    }

    return success({
      total: rows.length,
      created,
      skipped,
      invalid,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    console.error("Upload error:", err);
    return error("Failed to process file", 500);
  }
}
