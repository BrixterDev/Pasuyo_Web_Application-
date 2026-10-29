# Pasuyo

Pasuyo is a mobile-first local marketplace and delivery platform connecting customers, sellers, and riders. The application uses Next.js, TypeScript, Tailwind CSS, Supabase, PostgreSQL, Realtime, and OpenStreetMap.

## Features

- Customer discovery, search, cart, checkout, tracking, ratings, and profile management
- Seller storefronts, inventory, order management, analytics, and customer insights
- Rider availability, delivery discovery, navigation flow, GPS tracking, and earnings
- Supabase Auth with role-based server authorization
- PostgreSQL RLS, storage, and Realtime integration
- Responsive mobile navigation and accessible UI
- OpenStreetMap and Leaflet delivery maps
- Validation with Zod and protected server actions and route handlers

## Tech Stack

- Next.js 16 + App Router
- React 19 + TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL, Storage, and Realtime
- Zod validation
- Leaflet and React Leaflet
- Recharts
- Vitest and Testing Library

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   copy .env.example .env.local
   ```

3. Configure the required values in `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. Apply the database migration:

   ```bash
   supabase db push
   ```

   If Supabase CLI is not installed, use the Supabase dashboard SQL editor and run the migration from `supabase/migrations/001_initial_schema.sql`.

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Run checks:

   ```bash
   npm test
   npm run typecheck
   npm run lint
   npm run build
   ```

## Database Architecture

The project includes a normalized PostgreSQL schema for:

- Profiles and role-specific user data
- Store, product, category, cart, and product-image data
- Orders, order items, status history, and payment status
- Rider locations and delivery tracking
- Ratings, notifications, favorites, and search history

RLS policies are defined in the migration and should be reviewed in Supabase after applying the schema. Sensitive operations must always be validated on the server and never trusted from the client.

## Required Supabase Setup

Create the following storage buckets in Supabase Storage:

- `avatars`
- `product-images`
- `seller-images`

Configure bucket policies so users can only access and modify images they own. Enable Realtime for the relevant tables, including `orders` and `rider_locations`.

## Vercel Deployment

1. Import the repository into Vercel.
2. Set the environment variables from `.env.example` in the Vercel project settings.
3. Set the build command to `npm run build`.
4. Set the start command to `npm start`.
5. Add the Supabase environment variables as encrypted production variables.
6. Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Production Notes

- Privacy: rider and customer exact locations are restricted server-side.
- Security: server actions, route handlers, and RLS must validate ownership, roles, products, quantities, and order status transitions.
- Realtime: use Supabase Realtime for active delivery updates and notifications.
- Payments: the order schema supports future payment integration while keeping payment status separate from order status.
- Images: binary media is stored in Supabase Storage rather than PostgreSQL.

## GitHub

The repository is ready for GitHub. Never commit `.env.local` or any other local environment file containing secrets.
