import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.campaignRecipient.deleteMany();
  await prisma.messageLog.deleteMany();
  await prisma.incomingMessage.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.contactTag.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.blacklist.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.auditLog.deleteMany();

  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@onebyone.app" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@onebyone.app",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log(`Admin user: ${admin.email} / admin123`);

  const operatorPassword = await bcrypt.hash("operator123", 12);
  const operator = await prisma.user.upsert({
    where: { email: "operator@onebyone.app" },
    update: {},
    create: {
      name: "Operator",
      email: "operator@onebyone.app",
      password: operatorPassword,
      role: "OPERATOR",
    },
  });
  console.log(`Operator user: ${operator.email} / operator123`);

  const tags = await Promise.all(
    ["vip", "new-lead", "customer", "prospect", "event-signup"].map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name, color: "#6366f1" },
      })
    )
  );
  console.log(`Created ${tags.length} tags`);

  const contacts = [
    { name: "Raziyeh", phoneNumber: "+971506441588" },
    { name: "Haytham", phoneNumber: "+97144524466" },
    { name: "Saju", phoneNumber: "+97142696916" },
    { name: "Wasim", phoneNumber: "+97144564426" },
    { name: "James", phoneNumber: "+97143994937" },
    { name: "Rajesh", phoneNumber: "+971552230578" },
    { name: "Syed", phoneNumber: "+97145139666" },
    { name: "Jyldyz", phoneNumber: "+97143686206" },
    { name: "Ibrahim", phoneNumber: "+971554418053" },
    { name: "Irfan", phoneNumber: "+971525626893" },
    { name: "Pauline", phoneNumber: "+97144223500" },
    { name: "Mohammad", phoneNumber: "+97142529693" },
    { name: "Ali", phoneNumber: "+97143382560" },
    { name: "Avinash", phoneNumber: "+971507846692" },
    { name: "Varun", phoneNumber: "+971555459402" },
    { name: "Arif", phoneNumber: "+971555552225" },
    { name: "Mohammed", phoneNumber: "+97143850553" },
    { name: "Shahid", phoneNumber: "+97142666477" },
    { name: "Sikander", phoneNumber: "+971552626567" },
    { name: "Brilly", phoneNumber: "+971504582439" },
    { name: "Yasaman", phoneNumber: "+97144558888" },
    { name: "Haytham H", phoneNumber: "+97143615105" },
    { name: "May", phoneNumber: "+97143244775" },
    { name: "Akram", phoneNumber: "+971563959643" },
    { name: "Raja", phoneNumber: "+97142731537" },
    { name: "Syed S", phoneNumber: "+971525919703" },
    { name: "Sandrine", phoneNumber: "+97143494444" },
    { name: "Muhammad", phoneNumber: "+971552449160" },
    { name: "Yousuf", phoneNumber: "+97143957550" },
    { name: "Ksenia", phoneNumber: "+97143763600" },
    { name: "Hashem", phoneNumber: "+97147930532" },
    { name: "Abdulla", phoneNumber: "+97143434354" },
    { name: "Ahmad", phoneNumber: "+97144479700" },
    { name: "Shaikh", phoneNumber: "+97143434010" },
    { name: "Vessela", phoneNumber: "+97143622254" },
    { name: "Kunali", phoneNumber: "+971557475517" },
    { name: "Sulaiman", phoneNumber: "+97143850550" },
    { name: "Girlie", phoneNumber: "+97142411777" },
    { name: "Raheel", phoneNumber: "+97144547624" },
    { name: "Rasha", phoneNumber: "+97144522202" },
    { name: "Shavkat", phoneNumber: "+97143751574" },
    { name: "Gil", phoneNumber: "+97143069999" },
    { name: "Saleh", phoneNumber: "+97142501052" },
    { name: "Mi", phoneNumber: "+97143995578" },
    { name: "Gulshan", phoneNumber: "+971507872454" },
    { name: "Mannan", phoneNumber: "+97144226209" },
    { name: "Ahmed", phoneNumber: "+97142626210" },
    { name: "Ahmad A", phoneNumber: "+971505077777" },
    { name: "Nazih", phoneNumber: "+97142627620" },
    { name: "Khalid", phoneNumber: "+971558555542" },
    { name: "Moin", phoneNumber: "+971559810135" },
    { name: "John", phoneNumber: "+97143069998" },
    { name: "Abdul", phoneNumber: "+971507258641" },
    { name: "Naveed", phoneNumber: "+97143792565" },
    { name: "Roya", phoneNumber: "+971505013850" },
    { name: "Shameer", phoneNumber: "+971504663446" },
    { name: "Ali A", phoneNumber: "+971567894673" },
    { name: "Adib", phoneNumber: "+971557771119" },
    { name: "Vahid", phoneNumber: "+971552239514" },
    { name: "Mohamed", phoneNumber: "+97142944314" },
    { name: "Iqbal", phoneNumber: "+971505281223" },
    { name: "Hassan", phoneNumber: "+97143957551" },
    { name: "Obaid", phoneNumber: "+971506447717" },
    { name: "Naseer", phoneNumber: "+97144472352" },
    { name: "Belindi", phoneNumber: "+97144558889" },
    { name: "Juber", phoneNumber: "+97144527788" },
    { name: "Syed J", phoneNumber: "+97144501661" },
    { name: "Meiquan", phoneNumber: "+971508866847" },
    { name: "Elmira", phoneNumber: "+971508819308" },
    { name: "Abdulla A", phoneNumber: "+97143218886" },
    { name: "Ahmed A", phoneNumber: "+97142944384" },
    { name: "Fariba", phoneNumber: "+971502752142" },
    { name: "Liga", phoneNumber: "+97144516040" },
    { name: "Rashed", phoneNumber: "+971506592120" },
    { name: "Rahab", phoneNumber: "+97145714100" },
    { name: "Maria", phoneNumber: "+97144501600" },
    { name: "Sayyad", phoneNumber: "+97143352855" },
    { name: "Muhammad M", phoneNumber: "+971551071599" },
    { name: "Mithun", phoneNumber: "+97144572104" },
    { name: "Syed M", phoneNumber: "+971552385825" },
    { name: "Taresh", phoneNumber: "+97143596620" },
    { name: "Quaid", phoneNumber: "+971505084419" },
    { name: "Syed Q", phoneNumber: "+971552000122" },
    { name: "Zaheerahmed", phoneNumber: "+97144308902" },
    { name: "Mohammed Z", phoneNumber: "+97142677177" },
    { name: "Fahad", phoneNumber: "+971554415350" },
    { name: "Gordhan", phoneNumber: "+9715220032" },
    { name: "Dimple", phoneNumber: "+97144081000" },
    { name: "Rafat", phoneNumber: "+97147053600" },
    { name: "Imran", phoneNumber: "+971557667939" },
    { name: "Roxanne", phoneNumber: "+97148135300" },
    { name: "Vinod", phoneNumber: "+97143663200" },
    { name: "Sadaf", phoneNumber: "+971555549915" },
    { name: "Rajesh R", phoneNumber: "+97143257744" },
    { name: "Bimal", phoneNumber: "+971558829560" },
    { name: "Arthur", phoneNumber: "+97144550100" },
    { name: "Abshar", phoneNumber: "+97143554456" },
    { name: "Muhammad A", phoneNumber: "+97143804400" },
    { name: "Halima", phoneNumber: "+97144391200" },
    { name: "Adeel", phoneNumber: "+97145518469" },
    { name: "Olena", phoneNumber: "+97144550101" },
    { name: "Robert", phoneNumber: "+9714294444" },
    { name: "Tariq", phoneNumber: "+971555592828" },
    { name: "Hakan", phoneNumber: "+97144429673" },
    { name: "Sandra", phoneNumber: "+97143533229" },
    { name: "Joanne", phoneNumber: "+97144294444" },
    { name: "Muhammad J", phoneNumber: "+9715070577" },
    { name: "Waqas", phoneNumber: "+9711000000000" },
    { name: "Maria M", phoneNumber: "+971529090909" },
    { name: "Umar", phoneNumber: "+971559351450" },
    { name: "Inder", phoneNumber: "+971553211999" },
    { name: "Baber", phoneNumber: "+97143957552" },
    { name: "Ali B", phoneNumber: "+971552653026" },
    { name: "Matar", phoneNumber: "+971528077000" },
    { name: "Abdelrahman", phoneNumber: "+971505762811" },
    { name: "Ravinder", phoneNumber: "+97142396872" },
    { name: "Riyaz", phoneNumber: "+971554801400" },
    { name: "Sarfraz", phoneNumber: "+97143792244" },
    { name: "Shimroz", phoneNumber: "+97137555666" },
    { name: "Muhammad S", phoneNumber: "+971552615752" },
    { name: "Vijay", phoneNumber: "+971555562997" },
    { name: "Yousuf Y", phoneNumber: "+971564895658" },
    { name: "Rano", phoneNumber: "+971505886160" },
    { name: "Mohamed R", phoneNumber: "+971544432436" },
    { name: "Dharmesh", phoneNumber: "+97142562387" },
    { name: "Delorom", phoneNumber: "+971522815119" },
    { name: "Sasho", phoneNumber: "+97142583372" },
    { name: "Mohamed D", phoneNumber: "+97142944385" },
    { name: "Matilda", phoneNumber: "+97143584821" },
    { name: "Mohammad T", phoneNumber: "+97145515708" },
    { name: "Mozamil", phoneNumber: "+971506848356" },
    { name: "Fasalu", phoneNumber: "+97142557750" },
    { name: "Bernadette", phoneNumber: "+97143782841" },
    { name: "Mohi", phoneNumber: "+97143026000" },
    { name: "Sheraz", phoneNumber: "+971522025503" },
    { name: "Julia", phoneNumber: "+97143069997" },
    { name: "Raul", phoneNumber: "+97143444896" },
    { name: "Imtiyaz", phoneNumber: "+97143604422" },
    { name: "Muhammad I", phoneNumber: "+97142734660" },
    { name: "Sadaf S", phoneNumber: "+971502176037" },
    { name: "Khader", phoneNumber: "+97143792245" },
    { name: "Catalin", phoneNumber: "+971503534018" },
    { name: "Omar", phoneNumber: "+971505180003" },
    { name: "Hiteshkumar", phoneNumber: "+971508207978" },
  ];

  let created = 0;
  for (const c of contacts) {
    try {
      await prisma.contact.create({
        data: {
          name: c.name,
          phoneNumber: c.phoneNumber,
          countryCode: "+971",
          optInStatus: true,
          optInSource: "Business contact list",
          optInDate: new Date(),
        },
      });
      created++;
    } catch {
      // skip duplicates
    }
  }
  console.log(`Created ${created} contacts`);

  const templates = [
    {
      name: "Welcome Message",
      body: "Hi {{name}}, welcome to {{company}}! We're excited to have you on board. Let us know if you have any questions.",
      category: "Onboarding",
    },
    {
      name: "Follow-up",
      body: "Hi {{name}}, just checking in! Did you have a chance to review our proposal? Happy to jump on a quick call if you'd like to discuss.",
      category: "Sales",
    },
    {
      name: "Event Reminder",
      body: "Hey {{name}}, just a friendly reminder about our upcoming webinar tomorrow at 2 PM. Looking forward to seeing you there!",
      category: "Events",
    },
  ];

  for (const t of templates) {
    await prisma.messageTemplate.create({ data: t });
  }
  console.log(`Created ${templates.length} templates`);

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
  console.log("Default settings created");

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

  console.log("\nSeed completed! Login credentials:");
  console.log("  Admin:    admin@onebyone.app / admin123");
  console.log("  Operator: operator@onebyone.app / operator123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
