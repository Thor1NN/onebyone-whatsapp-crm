// Production seed - only creates admin user and defaults if they don't exist
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Check if admin already exists
  const existing = await prisma.user.findUnique({
    where: { email: "admin@onebyone.app" },
  });

  if (existing) {
    console.log("Database already seeded, skipping.");
    return;
  }

  console.log("First deploy — seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 12);
  await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@onebyone.app",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  await prisma.whatsAppSession.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", status: "NOT_CONNECTED" },
  });

  await prisma.telegramSession.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", status: "NOT_CONNECTED" },
  });

  const defaultSettings = [
    { key: "defaultCountryCode", value: "+971" },
    { key: "defaultMinDelay", value: "30" },
    { key: "defaultMaxDelay", value: "2700" },
    { key: "businessHourStart", value: "10:00" },
    { key: "businessHourEnd", value: "19:00" },
    { key: "dailySendingLimit", value: "100" },
    { key: "optOutKeywords", value: "stop,unsubscribe,cancel,remove me,no more messages,opt out,opt-out" },
  ];

  for (const s of defaultSettings) {
    await prisma.settings.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  console.log("Seed complete! Login: admin@onebyone.app / admin123");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    // Don't exit with error - app should still start
  })
  .finally(() => prisma.$disconnect());
