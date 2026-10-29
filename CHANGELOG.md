# Pasuyo — Updates & Deployment Changelog

This document summarizes all architectural fixes, UI/UX restorations, security hardening, and deployment resolutions applied to the **Pasuyo** platform (Next.js 16, React 19, Tailwind CSS v4, Supabase, Vercel, and GitHub).

---

## 1. UI/UX & Tailwind CSS v4 Restoration

### Issue
The application rendered the HTML structure, but styles and theme classes were completely missing ("layout visible, but no design"). Turbopack threw build warnings:
```text
Warning: Parsing CSS source code failed
Unknown at rule: @theme
```

### Root Cause
Next.js 16 requires a PostCSS configuration file to invoke `@tailwindcss/postcss`. Because `postcss.config.mjs` was absent from the project root:
- `@import "tailwindcss";` in `src/app/globals.css` was not compiled.
- `@theme inline` was treated as an invalid CSS rule.
- No Tailwind utility classes were generated for the browser.

### Solution
Created `postcss.config.mjs` in the project root:
```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```
* **Result**: Tailwind CSS v4 compiler compiled all utility classes and custom color variables into a `55 KB` stylesheet bundle with zero build warnings.

---

## 2. Security Hardening (.gitignore & Secret Protection)

### Issue
Git failed to parse the `.gitignore` file, causing `git status` to flag over **187,000 files** as untracked, including:
- `node_modules/`
- `.env.local` (containing private Supabase Service Role and Anon keys)
- `.next/` build caches
- `supabase/.temp/linked-project.json` (CLI project linkage and credentials)

### Root Cause
The `.gitignore` file was encoded in **UTF-16LE with BOM**, which Git for Windows / Linux failed to interpret, rendering all ignore rules completely inactive.

### Solution
Converted `.gitignore` to standard **UTF-8** and added comprehensive exclusion rules:
1. **Secrets & Environment Variables**:
   - `.env`, `.env*.local`, `*.env*` (preserving public `!.env.example` and `!.env.template`).
   - Certificates and keys (`*.pem`, `*.key`, `*.cert`, `credentials.json`, `serviceAccountKey.json`).
   - Package manager auth tokens (`.npmrc`, `.yarnrc`).
2. **Supabase Local Data**:
   - `supabase/.temp/`, `supabase/.branches/`, `.supabase/`.
3. **Build & Cache Artifacts**:
   - `.next/`, `out/`, `build/`, `dist/`, `*.tsbuildinfo`, `.turbo/`.
4. **OS & Editor Artifacts**:
   - `.DS_Store`, `Thumbs.db`, `Desktop.ini`, `.idea/`, `.vscode/*`.
* **Result**: `git status` cleanly tracks only source code files; secrets and dependencies are safeguarded from leaking to GitHub.

---

## 3. Vercel HTTP 500 "Internal Server Error" Resolution

### Issue
Deploying to Vercel resulted in an unhandled HTTP 500 screen stating:
```text
Internal Server Error
```

### Root Cause
In Next.js 16, `src/proxy.ts` acts as the edge middleware interceptor. It unconditionally executed `getSupabaseEnv()`, which threw:
```typescript
throw new Error("Supabase server configuration is incomplete.");
```
Because production `.env.local` secrets are not committed to GitHub, any deployment without pre-configured environment variables immediately crashed at the middleware level before rendering any page.

### Solution
Updated `src/proxy.ts` to check `isSupabaseConfigured()` before executing Supabase client initialization:
```typescript
export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getSupabaseEnv();
  if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }
  // ... proceed with session validation
}
```
* **Result**: If environment variables are missing or initializing, the middleware passes the request through safely rather than crashing the edge server.

---

## 4. Minified React Error #441 & #419 Fixes (Server Component Rendering)

### Issue
When opening pages on the deployed Vercel URL, the client rendered:
```text
Something went wrong
Minified React error #441
Minified React error #419
```

### Root Cause
React masks production server exceptions as `#441` ("An error occurred in the Server Components render") and `#419` ("The server could not finish this Suspense boundary"). Several runtime exceptions triggered this:
1. **Metadata URL Parsing**: `metadataBase: new URL(...)` in `src/app/layout.tsx` threw `TypeError: Invalid URL` if `NEXT_PUBLIC_SITE_URL` was entered without the `https://` protocol (e.g. `pasuyo-sepia.vercel.app`).
2. **Zod URL Validation**: `z.string().url()` in `src/lib/env.ts` threw uncaught validation errors for domain-only URLs.
3. **Supabase Image Remote Patterns**: In `next.config.ts`, `images.remotePatterns` was undefined if `NEXT_PUBLIC_SUPABASE_URL` was not present at build time, causing Next.js `<Image>` to reject Supabase storage URLs.
4. **Auth Page Server Components**: `src/app/login/page.tsx`, `src/app/register/page.tsx`, and `requireUser()` in `src/lib/auth.ts` threw unhandled errors during server rendering when attempting to query an unconfigured Supabase instance.

### Solutions Applied
1. **Safe Metadata URL**:
   Added `getMetadataBase()` in `src/app/layout.tsx` to automatically normalize domains with `https://` and fall back gracefully if invalid.
2. **Zod Schema Relaxation**:
   Changed `NEXT_PUBLIC_SITE_URL` in `src/lib/env.ts` to `z.string().optional()`.
3. **Permanent Supabase Image Patterns**:
   Updated `next.config.ts` to include wildcard matching for Supabase storage:
   ```typescript
   images: {
     remotePatterns: [
       {
         protocol: "https",
         hostname: "*.supabase.co",
         pathname: "/storage/v1/object/public/**",
       },
     ],
   }
   ```
4. **Auth & Session Fallbacks**:
   Updated `LoginPage`, `RegisterPage`, and `requireUser()` to verify `isSupabaseConfigured()` before executing Supabase queries, allowing the forms to render safely.
5. **Global Error Boundary (`src/app/error.tsx`)**:
   Created a recovery UI with a retry action and actionable error messages when database connections cannot be established.

---

## 5. Deployment Guide: GitHub + Vercel + Supabase

To run Pasuyo in production:

### Step 1: Push Source Code to GitHub
```powershell
git add .
git commit -m "feat: configure styles, security rules, and deployment resiliency"
git push origin main
```

### Step 2: Configure Environment Variables in Vercel
In your **Vercel Dashboard** → **Pasuyo** → **Settings** → **Environment Variables**, add the following:

| Variable Name | Description | Example / Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Public Anonymous Key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Private Service Role Key | `eyJhbGciOi...` |
| `NEXT_PUBLIC_SITE_URL` | Deployed Domain | `https://pasuyo-sepia.vercel.app` |

*Ensure **Production**, **Preview**, and **Development** checkboxes are selected.*

### Step 3: Trigger Production Deployment
Because Next.js embeds `NEXT_PUBLIC_*` variables at **build time**, trigger a fresh build after saving variables:
1. Go to **Deployments** in Vercel.
2. Click the three dots (`...`) on the latest deployment → **Redeploy**.
3. Once completed, your application will be live, styled, and authenticated.
