# LocalBoost AI — AI Google Review QR SaaS

**LocalBoost AI** is a production-grade, multi-tenant SaaS application that enables restaurants, cafes, hotels, clinics, salons, gyms, and local businesses to manage customer feedback and Google Review QR experiences.

---

## 🌟 Key Features

### 1. Smart Mobile-First QR Review Flow
- **Universal Google Access**: Customers have access to the Google Review link regardless of their rating. Low ratings are **never blocked or diverted away** from Google (strict policy compliance).
- **Interactive Rating Flow**: 1-to-5 star rating buttons capture instant feedback and log `rating_selected` analytics.
- **Multilingual Local Review Suggestion Engine**:
  - Deterministic and randomized templates in **English (`en`)**, **Hindi (`hi`)**, and **Gujarati (`gu`)**.
  - Generates 3 distinct, editable review drafts based strictly on customer-selected categories (Food, Taste, Service, Staff, Ambience, Cleanliness, Value for Money, Waiting Time, Price, Overall Experience).
  - Clear message: *"You can edit this suggestion to match your actual experience before sharing it."*
  - Zero paid AI APIs required (no OpenAI, Gemini, or Claude costs).
- **Review Copy & Direct Redirection**: One-click copy (`review_copied`) followed by direct redirection to the business's Google Review dialog (`google_review_clicked`).
- **Private Feedback Channel**: Available for all ratings, with empathetic messaging for lower ratings (*"We're sorry your experience wasn't perfect. Tell us what went wrong so the business can improve"*). Saves directly to the private feedback inbox.

### 2. Multi-Tenant Role-Based Access Control (RBAC)
- **Super Admin**:
  - Global platform analytics (total customers, active tenants, businesses, QR scans, ratings, avg rating, feedback, Google clicks).
  - Searchable customer management table (search by Customer ID, name, email, business name).
  - Customer deep profile inspection with star distribution and interaction breakdown.
  - Secure customer dashboard inspection / impersonation with audit logging and time-limited exit banner.
  - Announcements manager (create, edit, delete, toggle active).
  - Centralized WhatsApp support number and support message configuration.
  - Platform branding settings.
- **Customer Tenant**:
  - Business profile settings (name, HTTPS Google review link, category, phone, logo, unique slug).
  - Permanent, cryptographically secure Customer ID (e.g. `LB-CUS-8F42K9`) with one-click copy.
  - High-resolution tabletop standee QR generator with PNG download and direct review link copy.
  - Real interaction metrics and conversion funnel (Scans → Ratings → Copies → Google Clicks → Feedback).
  - Private customer feedback inbox with status progression (`new`, `in_progress`, `resolved`).
  - Platform announcements with dynamic unread notification badge count.
  - One-click WhatsApp support pre-filled with Customer ID, Name, Business, and help message.

---

## 🏗️ Technology Stack

- **Framework**: React / Next.js compatible architecture with Vite + Express full-stack support
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS) & Local Storage Engine Fallback
- **QR Generation**: `qrcode` canvas rendering
- **Icons**: Lucide React

---

## 🗄️ Database Schema (10 Tables)

The database schema is defined in `supabase/schema.sql`:

1. `profiles` — User profile, unique customer code (`LB-CUS-XXXXXX`), role (`admin` | `customer`), status (`active` | `disabled`), timestamps.
2. `businesses` — Business name, unique slug, HTTPS Google review URL, phone, address, category, logo URL.
3. `review_settings` — Default language, welcome text, thank-you text, enabled toggle, accent color (`#6C3BFF`).
4. `review_suggestions` — Optional custom business presets by rating and category.
5. `analytics` — Privacy-preserving interaction events (`qr_scan`, `rating_selected`, `suggestion_generated`, `review_copied`, `google_review_clicked`, `feedback_submitted`). Raw IPs are never stored.
6. `feedback` — Private customer feedback with rating, text, contact details, and resolution status (`new`, `in_progress`, `resolved`).
7. `announcements` — Platform notices with title, message, type (`info`, `warning`, `success`, `urgent`), active status.
8. `announcement_reads` — Tracks read state per user ID with unique constraint `(announcement_id, user_id)`.
9. `admin_settings` — Global configuration keys (`app_name`, `whatsapp_support_number`, `whatsapp_support_message`, `default_accent_color`).
10. `impersonation_audit_logs` — Immutable audit trail of admin inspection actions.

---

## 🚀 Getting Started

### 1. Installation

```bash
git clone https://github.com/your-username/localboost-ai.git
cd localboost-ai
npm install
```

### 2. Environment Variables Setup

Create a `.env` or `.env.local` file by copying `.env.example`:

```bash
cp .env.example .env
```

Configure your Supabase credentials:

```ini
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"

# Vite compatibility equivalents
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-public-key"

# Application URL
APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> **Note**: Even if Supabase credentials are not provided initially, LocalBoost AI includes a built-in multi-tenant local engine that persists records, auth sessions, and analytics in browser storage with identical table schemas. You can connect Supabase at any time via the **Database Status** button in the top navigation!

### 3. Apply Supabase Database Migration

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project and navigate to **SQL Editor** → **New Query**.
3. Copy and paste the entire contents of `supabase/schema.sql`.
4. Click **Run** to provision all 10 tables, triggers, and Row Level Security policies.

### 4. Admin Bootstrap Procedure

To promote any registered user to **Super Admin**, run this query in your Supabase SQL Editor:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

*(Never put admin passwords or service-role keys directly in client-side code).*

### 5. Running the Application

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🚢 Vercel Deployment Guide

1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: initial LocalBoost AI release"
   git remote add origin https://github.com/your-org/localboost-ai.git
   git push -u origin main
   ```
2. In the [Vercel Dashboard](https://vercel.com/new), click **Import Project** and select your GitHub repository.
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `APP_URL` (set to your Vercel deployment URL)
4. Click **Deploy**.
5. Once deployed, run the migration in `supabase/schema.sql` on your Supabase project.

---

## 🔒 Security & Privacy Guarantees

- **No Review Gating**: In compliance with Google's Review Policy and consumer protection standards, every customer can access the Google Review button regardless of whether they rate 1 star or 5 stars.
- **Privacy by Design**: Raw IP addresses are never collected or stored. Anonymous session hashes are used strictly for deduplicating repeated scans within short time windows.
- **Tenant Isolation**: Customers can read and update only their own business records, feedback, and analytics via Supabase Row Level Security.
- **Audited Impersonation**: Admin inspections of customer dashboards are logged with target user IDs and timestamps in `impersonation_audit_logs`.

---

## 📄 License

Apache-2.0 License.
