# XeroLink

A print-on-demand platform that connects students with print shops and delivery partners.

## What it does

Students upload documents, choose a print shop, and get their prints delivered home. Shop owners manage the print queue in real-time. Delivery partners collect and deliver orders, verified via OTP.

## Roles

| Role | Portal | Entry |
|---|---|---|
| Student | `/shops`, `/orders` | Browse shops, place & track orders |
| Shop Owner | `/dashboard` | Manage queue, toggle open/close |
| Delivery Boy | `/slot`, `/deliver` | View ready orders, verify OTP |

## Tech Stack

- **Next.js 16** (App Router)
- **Supabase** — Auth, Postgres, Realtime, Storage
- **Tailwind CSS**
- **TypeScript**

## Getting Started

```bash
cd xerolink
npm install
npm run dev
```

### Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Key Features

- Drag-and-drop file upload (PDF, DOCX, images)
- Live price calculator (B&W / colour, single / double sided)
- Real-time order tracking via Supabase Realtime
- OTP-based delivery verification
- Role-aware home page (guest / student / owner / delivery)
- Shop open/close toggle with live queue
