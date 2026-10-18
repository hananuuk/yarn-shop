# утас / utas: yarn shop (Milestone 1)

Bilingual (Mongolian / English) yarn shop with an admin panel.
Name, logo, brands, products and prices are **placeholders**.

## Run it on your laptop

Needs Node.js 20 or newer.

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run setup             # creates the local database and adds 15 sample products
npm run dev
```

Open http://localhost:3000. No database to install: local data lives in `./data`.
To start over with a clean shop, stop the server, delete the `data` folder and run `npm run setup` again.

### Log in as admin

1. In `.env`, set `ADMIN_PHONES` to your own 8-digit number (comma-separate several).
2. In the shop, click the account icon and log in with that number.
3. In test mode no SMS is sent: the login code is shown on the page (and printed in the terminal).
4. Go to http://localhost:3000/admin, or Account → Admin.

### Test a purchase

Add yarn to the basket → Check out → fill in the address → "Pay with QPay".
The payment page is in **test mode**: press "Simulate successful payment". The order becomes *Paid*,
stock goes down, and it appears in Admin → Orders.

## What's in it

**Shop**
- Catalog with the title filter: pick Brand / Material / Needle size and the big title builds itself
  ("Ноос, Hill Yarns, 5–6 мм"), each part in its own colour. Sorting by newest / price.
- Supplies section, product pages (photos or drawn placeholder, stock, sale price, details, reviews).
- Basket that works before login and is kept after login.
- Login with phone number + SMS code. No passwords.
- Checkout with Ulaanbaatar districts, payment page with QR, order history, saved yarn.
- Every page in Mongolian and English (`/mn/...`, `/en/...`). The switch keeps you on the same page.

**Admin** (`/admin`)
- Dashboard: revenue, paid orders, sign-ups, revenue per day, the drop-off funnel
  (viewed → added to basket → started checkout → paid), most viewed / saved / sold, low stock.
- Products: add and edit, photos (choose the main one), price, sale price, stock, out of stock, hide/show,
  brand, material, needle size, colour.
- Orders: filter by status, address and phone, items, payment, full history of who changed what,
  move to Packed → Out for delivery → Delivered, or cancel (stock goes back), private notes.
- Customers: sign-up date, last seen, paid orders, total spent, saved items.
- Reviews: reply publicly or delete.

## Where things live

| To change | File |
|---|---|
| Shop name, brand colours | `src/config.ts` and `src/app/globals.css` (`@theme`) |
| Logo | `src/components/Logo.tsx` |
| All shop text, MN and EN | `src/lib/i18n.ts` |
| Delivery fee, admin phones | `.env` |
| UB districts, needle-size groups | `src/config.ts` |

## Built to plug things in later

Each outside service sits behind one small interface, so going live is configuration, not a rewrite.

| Service | Now | Later | Where |
|---|---|---|---|
| Payments | Test mode (`PAYMENT_PROVIDER=mock`) | QPay: set `PAYMENT_PROVIDER=qpay` + credentials | `src/lib/payments/` |
| Login SMS | Code shown on screen | A Mongolian SMS gateway | `src/lib/sms/index.ts` |
| Photos | `./data/uploads` | Cloud storage (Supabase Storage / R2 / S3) | `src/lib/storage.ts` |
| Database | PGlite file in `./data` | Postgres (Supabase, Neon…): set `DATABASE_URL` | `src/db/` |

The QPay connector (`src/lib/payments/qpay.ts`) follows QPay's v2 merchant API but **has not been tested against
a real QPay account**. Test it with sandbox credentials before taking real money.
Payments are never trusted from the callback alone: the shop always asks QPay whether the invoice is really paid.

## Before going live (checklist)

- [ ] QPay merchant credentials → test in sandbox → switch `PAYMENT_PROVIDER=qpay`
- [ ] SMS provider for login codes
- [ ] Hosted Postgres database (`DATABASE_URL`), then `npm run db:migrate`
- [ ] Cloud storage for photos
- [ ] Hosting + domain; set `SITE_URL` to the real https address (QPay calls it back)
- [ ] Real products and photos; delete the sample products
- [ ] Final name, logo, colours
- [ ] Privacy policy and delivery/returns pages

## Commands

| | |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run setup` | Create the database tables and sample products |
| `npm run db:generate` | After changing `src/db/schema.ts`: create a new migration |
| `npm run db:migrate` | Apply migrations |
| `npm run typecheck` | Check types |
