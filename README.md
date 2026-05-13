# OneByOne WhatsApp CRM Sender

A production-ready WhatsApp automation dashboard for legitimate business follow-up messaging. Connect your WhatsApp account via QR code, manage contacts, create campaigns with human-like randomized timing, and track delivery — all with built-in compliance safeguards.

## Features

- **WhatsApp QR Login** — scan to connect, auto-reconnect, session persistence
- **Contact Management** — manual add, CSV/Excel upload, tags, opt-in tracking, blacklist
- **Message Templates** — personalization variables (`{{name}}`, `{{company}}`, etc.), live preview
- **Campaign Builder** — select contacts/tags, random delay ranges (30s–45min), business hours, daily limits
- **Queue Engine** — BullMQ-powered one-at-a-time sending with retry logic
- **Inbox** — incoming message tracking, status marking, notes
- **Compliance** — opt-in required, auto opt-out detection, blacklist enforcement, audit logs
- **Safety Controls** — emergency stop, pause/resume, daily caps, confirmation dialogs
- **Dark/Light Mode** — clean, modern UI with shadcn/ui components

## Tech Stack

| Layer     | Technology                                       |
|-----------|--------------------------------------------------|
| Frontend  | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui  |
| Backend   | Next.js API Routes, Prisma ORM                   |
| Database  | PostgreSQL                                        |
| Queue     | BullMQ + Redis                                    |
| WhatsApp  | whatsapp-web.js (Puppeteer-based)                |
| Auth      | JWT + bcrypt                                      |

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** running locally or remote
- **Redis** running locally or remote
- **Chromium/Chrome** (required by whatsapp-web.js/Puppeteer)

## Quick Start

### 1. Clone and install

```bash
cd onebyone-whatsapp-crm
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your database and Redis URLs
```

### 3. Set up database

```bash
# Create the database
createdb onebyone_crm

# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Login

```
Admin:    admin@onebyone.app / admin123
Operator: operator@onebyone.app / operator123
```

## How to Test QR Login

1. Login to the dashboard
2. Go to **WhatsApp** in the sidebar
3. Click **Connect WhatsApp**
4. Wait for the QR code to appear (requires Redis and Chromium)
5. Open WhatsApp on your phone > Settings > Linked Devices > Link a Device
6. Scan the QR code
7. Status will change to **Connected**

## How to Create Your First Campaign

1. **Add contacts**: Go to Contacts > Add Contact or Upload CSV
2. **Create a template** (optional): Go to Templates > New Template
3. **Build campaign**: Go to Campaigns > New Campaign
   - Name your campaign
   - Write or load a message template
   - Set delay range (e.g., 30s min, 2700s max)
   - Select contacts
   - Click Create Campaign
4. **Launch**: On the campaign detail page, click Launch Campaign
5. **Monitor**: Watch real-time progress, pause/resume/stop as needed

## Database Commands

```bash
npm run db:generate   # Regenerate Prisma client
npm run db:push       # Push schema changes
npm run db:migrate    # Create migration
npm run db:seed       # Seed database
npm run db:studio     # Open Prisma Studio
npm run db:reset      # Reset database
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/           # Login page
│   ├── (dashboard)/            # All dashboard pages
│   │   ├── dashboard/          # Main dashboard
│   │   ├── whatsapp/           # QR connection
│   │   ├── contacts/           # Contact management
│   │   ├── templates/          # Message templates
│   │   ├── campaigns/          # Campaign list + builder
│   │   ├── inbox/              # Incoming messages
│   │   ├── reports/            # Audit logs
│   │   ├── blacklist/          # Blacklisted contacts
│   │   ├── settings/           # App settings
│   │   └── users/              # User management
│   └── api/                    # All API routes
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   └── layout/                 # Sidebar, page header
├── lib/
│   ├── auth.ts                 # JWT + bcrypt helpers
│   ├── prisma.ts               # Prisma client singleton
│   ├── validators.ts           # Zod schemas + phone utils
│   ├── utils.ts                # Delay, time, cn utilities
│   ├── auth-context.tsx        # React auth context
│   ├── whatsapp/manager.ts     # WhatsApp connection manager
│   └── queue/sender.ts         # BullMQ campaign sender
└── prisma/
    ├── schema.prisma           # Database schema (13 tables)
    └── seed.ts                 # Seed data
```

## Safety and Compliance

This tool is designed for **opted-in business communication only**:

- Contacts require `optInStatus: true` before receiving messages
- Opt-out keywords (`stop`, `unsubscribe`, etc.) auto-blacklist contacts
- Blacklisted contacts are permanently excluded from all campaigns
- Admin must confirm before launching campaigns
- All actions are logged in the audit trail
- Daily sending limits prevent excessive messaging
- Randomized delays create human-like sending patterns

**Do not use this tool for spam or unsolicited messaging.**

## License

MIT
