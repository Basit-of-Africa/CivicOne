# CivicOne Phase 6 — Implementation Plan

## The Pivot: From eCitizen Clone to Civic Operating System

CivicOne is **not** a government portal. It is a **private-sector service orchestration platform** — a unified front door to Nigerian government services that adds value at every step without requiring direct government API integrations.

### Core Insight

Most Nigerian government agencies (CAC, NIMC, FRSC, NIS, FIRS) do not have open developer APIs. Rather than waiting for government access, CivicOne acts as the **guided experience layer** on top of existing government portals — providing checklists, document management, status tracking, and reminders.

### The Model

```
civicone.ng/services/cac            → cac.gov.ng
civicone.ng/services/nimc           → nimc.gov.ng
civicone.ng/services/frsc           → frsc.gov.ng
civicone.ng/services/nis            → nis.gov.ng
civicone.ng/services/firs           → firs.gov.ng
```

Users interact with CivicOne before, during, and after engaging with government agencies. CivicOne captures the user relationship and adds convenience that government portals cannot.

---

## Phase 6 Overview

| Phase | Focus | Duration | Dependencies |
|---|---|---|---|
| **6A** | Smart Service Guide | 1 week | None |
| **6B** | Application Companion | 2 weeks | 6A |
| **6C** | Payment & Notifications | 2 weeks | 6A |
| **6D** | Record Management & Polish | 1 week | 6B, 6C |
| **6E** | Beta Launch | 1 week | All above |

**Total: ~7 weeks to beta launch**

---

## Phase 6A — Smart Service Guide (Week 1)

### Goal

Transform the existing service detail page from a static information display into a **personalized, actionable guide** that prepares users for government interactions.

### What Already Exists

- ✅ 22 services with categories, jurisdictions, requirements, fees, steps, FAQs
- ✅ Service detail page with full information display
- ✅ Search and filter functionality
- ✅ Save/bookmark services
- ✅ Jurisdiction data (37 states + FCT, ~77 LGAs)

### What to Build

#### 6A-1: Personalized Checklist Generator

**File:** `modules/services/components/service-checklist.tsx` (new)

Generate a personalized checklist based on:
- User's profile (state, LGA, gender, age)
- Service requirements (from DB)
- Documents already in wallet
- Documents still needed

```tsx
// Checklist items show:
// - ✅ Already in wallet (NIN slip, passport photo, etc.)
// - ⬜ Still needed (utility bill, guarantor letter, etc.)
// - ℹ️ How to obtain each item
// - 📋 Download as PDF
```

**Effort:** 1 day

#### 6A-2: Step-by-Step Guide Enhancement

**File:** `modules/services/components/service-guide.tsx` (new)

Replace the simple numbered steps with a rich, expandable guide:

```tsx
// Each step shows:
// - Step number and title
// - Estimated time
// - What to bring
// - What happens at this step
// - Common mistakes to avoid
// - Pro tips from CivicOne
// - Office location (if applicable)
```

**Effort:** 1 day

#### 6A-3: Office Locator

**File:** `modules/services/components/office-locator.tsx` (new)

Show the nearest government office for the selected service:
- Filter by service type (CAC, NIMC, FRSC, etc.)
- Filter by state and LGA
- Google Maps embed or link
- Office hours and contact info
- Distance calculation from user's saved address

**Data source:** Extend `prisma/service-catalogue-data.ts` with office locations, or create a new `prisma/office-locations.ts` seed file.

**Effort:** 1 day

#### 6A-4: "Open on [Agency]" Button

**File:** `modules/services/components/agency-link-button.tsx` (new)

Smart redirect button that:
- Shows the official agency URL
- Opens in a new tab
- Tracks the click for analytics (server action)
- Optionally shows CivicOne guide in a split view
- Records that the user "started" this service

```tsx
// Button shows: "Open on CAC Portal →"
// On click:
// 1. Log analytics event (service_id, user_id, timestamp)
// 2. Open agency URL in new tab
// 3. Show CivicOne guide in sidebar/modal
```

**Effort:** 0.5 day

#### 6A-5: Fee Calculator

**File:** `modules/services/components/fee-calculator.tsx` (new)

Interactive fee breakdown:
- Government fees (from service data)
- Service charges (CivicOne premium, if applicable)
- Total estimated cost
- Payment instructions
- "Pay with Paystack" button (Phase 6C)

**Effort:** 0.5 day

### Phase 6A Deliverables

| Deliverable | File | Status |
|---|---|---|
| Personalized checklist | `modules/services/components/service-checklist.tsx` | New |
| Step-by-step guide | `modules/services/components/service-guide.tsx` | New |
| Office locator | `modules/services/components/office-locator.tsx` | New |
| Agency link button | `modules/services/components/agency-link-button.tsx` | New |
| Fee calculator | `modules/services/components/fee-calculator.tsx` | New |
| Enhanced service detail page | `app/(app)/services/[slug]/page.tsx` | Update |
| Office location seed data | `prisma/office-locations.ts` | New |

### Phase 6A Database Changes

```prisma
// Add to schema.prisma

model OfficeLocation {
  id          String   @id @db.VarChar(64)
  agency      String   @db.VarChar(64)  // CAC, NIMC, FRSC, NIS, FIRS, etc.
  name        String   @db.VarChar(200)
  state       String   @db.VarChar(80)
  lga         String?  @db.VarChar(80)
  address     String   @db.VarChar(500)
  latitude    Float?
  longitude   Float?
  phone       String?  @db.VarChar(32)
  email       String?  @db.VarChar(320)
  hours       String?  @db.VarChar(200)
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("office_locations")
}

model ServiceAnalytics {
  id          String   @id @db.VarChar(64)
  userId      String   @map("user_id") @db.VarChar(64)
  serviceId   String   @map("service_id") @db.VarChar(64)
  action      String   @db.VarChar(32)  // view, checklist, guide, agency_click, start
  metadata    Json?
  createdAt   DateTime @default(now()) @map("created_at")

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  service Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@unique([userId, serviceId, action, createdAt])
  @@map("service_analytics")
}
```

---

## Phase 6B — Application Companion (Weeks 2-3)

### Goal

Help users complete government applications by providing a guided, trackable experience that bridges CivicOne and agency portals.

### What Already Exists

- ✅ Application engine with dynamic forms, workflows, document upload
- ✅ 3 mock provider integrations (CAC, Passport, Driver Licence)
- ✅ Application tracking with status timeline
- ✅ Document wallet with signed URLs
- ✅ PDF certificate generation

### What to Build

#### 6B-1: Agency Portal Companion View

**File:** `app/(app)/services/[slug]/companion/page.tsx` (new)

A split-view or tabbed experience:
- **Left panel:** CivicOne guide (checklist, steps, tips)
- **Right panel:** Embedded agency portal (or link to open)
- **Bottom panel:** Document upload, notes, progress tracker

This is the "application companion" — users work through the government process with CivicOne as their guide.

**Effort:** 2 days

#### 6B-2: Application Progress Tracker (User-Reported)

**File:** `modules/applications/components/progress-tracker.tsx` (new)

Since we can't track actual agency status, let users report progress:
- "I submitted my application" (upload confirmation)
- "I received a reference number" (enter reference)
- "I picked up my document" (upload proof)
- "My application was rejected" (upload rejection letter)

Each status change creates a timeline entry and triggers a notification.

**Effort:** 1 day

#### 6B-3: Document Pre-Fill from Wallet

**File:** `modules/applications/components/wallet-prefill.tsx` (new)

When starting an application, auto-fill fields from:
- User profile (name, DOB, address)
- Identity verification (NIN, legal name)
- Existing wallet documents (passport photo, NIN slip)

Show which fields are pre-filled and which need manual entry.

**Effort:** 1 day

#### 6B-4: Application Templates

**File:** `modules/applications/templates/` (new directory)

Pre-built application templates for each service:
- Business Registration (CAC)
- National Passport (NIS)
- Driver's Licence (FRSC)
- Birth Certificate (NPC)
- Marriage Registration (NPC)

Each template includes:
- Required documents list
- Step-by-step guide
- Fee breakdown
- Estimated timeline
- Common rejection reasons

**Effort:** 2 days

#### 6B-5: Application History & Analytics

**File:** `app/(app)/applications/analytics/page.tsx` (new)

Show users their application patterns:
- Total applications started vs completed
- Average completion time
- Most common services
- Documents expiring soon
- Cost summary

**Effort:** 1 day

### Phase 6B Deliverables

| Deliverable | File | Status |
|---|---|---|
| Agency portal companion | `app/(app)/services/[slug]/companion/page.tsx` | New |
| Progress tracker | `modules/applications/components/progress-tracker.tsx` | New |
| Wallet pre-fill | `modules/applications/components/wallet-prefill.tsx` | New |
| Application templates | `modules/applications/templates/*.ts` | New |
| Application analytics | `app/(app)/applications/analytics/page.tsx` | New |
| Updated application flow | `app/(app)/applications/` | Update |

---

## Phase 6C — Payment & Notifications (Weeks 3-4)

### Goal

Enable payment processing and in-app notifications to complete the core product loop.

### What Already Exists

- ✅ Payment step in application workflow (demo checkbox)
- ✅ Session management and auth
- ✅ Email stub (console.log)

### What to Build

#### 6C-1: Paystack Integration

**File:** `modules/payments/service.ts` (new)

Integrate Paystack for:
- Application processing fees (₦500–2,000)
- Premium subscription payments (₦1,500/month)
- Document storage fees (if applicable)

```tsx
// Payment flow:
// 1. User clicks "Pay" on application or subscription
// 2. Create Paystack transaction (server action)
// 3. Redirect to Paystack checkout
// 4. Paystack webhook confirms payment
// 5. Update application status / activate subscription
// 6. Send confirmation email
```

**Effort:** 2 days

#### 6C-2: Email Delivery (Resend)

**File:** `server/email.ts` (update)

Replace console.log stub with Resend integration:

```bash
npm install resend
```

```tsx
// server/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html }: EmailParams) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}
```

**Email templates to create:**
- Welcome / email verification
- Password reset
- Application status update
- Payment confirmation
- Document expiry reminder

**Effort:** 1 day

#### 6C-3: In-App Notifications

**File:** `modules/notifications/service.ts` (new), `app/(app)/notifications/page.tsx` (update)

Create notification system:
- Database model for notifications
- Server actions for creating/listing/mark-as-read
- Real-time polling or SSE for updates
- Bell icon in header with unread count

**Notification types:**
- Application status changed
- Document expiring soon
- Payment confirmed
- New service available
- System announcement

**Database model:**

```prisma
model Notification {
  id          String   @id @db.VarChar(64)
  userId      String   @map("user_id") @db.VarChar(64)
  type        String   @db.VarChar(32)  // application, document, payment, system
  title       String   @db.VarChar(200)
  body        String   @db.VarChar(1000)
  link        String?  @db.VarChar(512)
  readAt      DateTime? @map("read_at")
  createdAt   DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt])
  @@map("notifications")
}
```

**Effort:** 2 days

#### 6C-4: Email Notification Preferences

**File:** `modules/users/components/notification-preferences.tsx` (new)

Let users control which emails they receive:
- Application updates
- Payment confirmations
- Document expiry reminders
- Marketing (opt-in only)

**Effort:** 0.5 day

### Phase 6C Deliverables

| Deliverable | File | Status |
|---|---|---|
| Paystack integration | `modules/payments/service.ts` | New |
| Email delivery (Resend) | `server/email.ts` | Update |
| Email templates | `server/email-templates/` | New |
| In-app notifications | `modules/notifications/service.ts` | New |
| Notifications page | `app/(app)/notifications/page.tsx` | Update |
| Notification preferences | `modules/users/components/notification-preferences.tsx` | New |
| Notification database model | `prisma/schema.prisma` | Update |

---

## Phase 6D — Record Management & Polish (Week 5)

### Goal

Polish the experience, ensure all features work together, and prepare for beta launch.

### What to Build

#### 6D-1: Enhanced Record Detail

Update `app/(app)/records/[id]/page.tsx` to show:
- Full service guide for the record
- Related documents in wallet
- Expiry countdown
- "Renew" button (starts new application)
- Download PDF certificate

**Effort:** 1 day

#### 6D-2: Expiry Reminder System

**File:** `modules/records/service.ts` (update)

Automated reminders for expiring documents:
- 90 days before expiry: email + in-app
- 30 days before expiry: email + in-app
- 7 days before expiry: email + in-app + SMS (optional)

**Effort:** 1 day

#### 6D-3: Landing Page Update

Update `app/(marketing)/page.tsx` to reflect the new positioning:
- "Nigeria's civic operating system" (not "eCitizen for Nigeria")
- Emphasize convenience, not government integration
- Show social proof (if available)
- Clear CTA: "Start your first service"

**Effort:** 1 day

#### 6D-4: Mobile Optimization

Review all pages for mobile responsiveness:
- Service detail page
- Application companion
- Document wallet
- Notifications

**Effort:** 1 day

#### 6D-5: Error Handling & Edge Cases

- Offline support (service worker)
- Error boundaries for all routes
- Loading states for all async operations
- Empty states with helpful CTAs

**Effort:** 1 day

### Phase 6D Deliverables

| Deliverable | File | Status |
|---|---|---|
| Enhanced record detail | `app/(app)/records/[id]/page.tsx` | Update |
| Expiry reminder system | `modules/records/service.ts` | Update |
| Updated landing page | `app/(marketing)/page.tsx` | Update |
| Mobile optimization | All pages | Review |
| Error handling | All routes | Update |

---

## Phase 6E — Beta Launch (Week 6)

### Pre-Launch Checklist

- [ ] All Phase 6A-D features tested
- [ ] Paystack account verified and funded
- [ ] Resend account verified (domain authenticated)
- [ ] SSL certificate active
- [ ] Domain configured (civicone.ng)
- [ ] Environment variables set in production
- [ ] Database migrations run
- [ ] Seed data loaded
- [ ] Monitoring and error tracking configured
- [ ] Support email configured (support@civicone.ng)

### Launch Steps

1. **Soft launch** (Week 6, Day 1-3)
   - Invite 10-20 beta users
   - Collect feedback daily
   - Fix critical bugs immediately

2. **Feedback iteration** (Week 6, Day 4-5)
   - Prioritize top 3 user complaints
   - Implement quick fixes
   - Update documentation

3. **Public launch** (Week 6, Day 6-7)
   - Social media announcement
   - Product Hunt submission
   - Tech community outreach (Twitter, Reddit, Dev.to)

### Success Metrics (First 30 Days)

| Metric | Target |
|---|---|
| Registered users | 500 |
| Service views | 5,000 |
| Checklists generated | 1,000 |
| Applications started | 200 |
| Documents uploaded | 500 |
| Paying users (premium) | 50 |

---

## Database Migration Plan

### New Tables

1. `office_locations` — Government office locations
2. `service_analytics` — User interaction tracking
3. `notifications` — In-app notifications
4. `payments` — Paystack payment records
5. `subscriptions` — Premium subscription status

### Updated Tables

1. `services` — Add `agency_url` field for redirect links
2. `services` — Add `guide_content` JSON field for rich guides
3. `users` — Add `notification_preferences` JSON field

### Migration Order

1. Create new tables
2. Add new columns to existing tables
3. Seed office locations
4. Migrate existing data (if needed)

---

## Environment Variables Needed

```bash
# Paystack
PAYSTACK_SECRET_KEY="sk_live_..."
PAYSTACK_PUBLIC_KEY="pk_live_..."
PAYSTACK_WEBHOOK_SECRET="..."

# Resend (Email)
RESEND_API_KEY="re_..."
EMAIL_FROM="CivicOne <hello@civicone.ng>"

# Google Maps (Office Locator)
GOOGLE_MAPS_API_KEY="..."

# App
NEXT_PUBLIC_APP_URL="https://civicone.ng"
```

---

## Cost Projections (First 6 Months)

| Item | Monthly Cost | Notes |
|---|---|---|
| Hosting (Vercel Pro) | ₦8,000 | ~$20/month |
| Database (Supabase Pro) | ₦8,000 | ~$20/month |
| Email (Resend) | ₦0 | Free tier: 3,000 emails/month |
| Paystack fees | 1.5% per transaction | No upfront cost |
| Google Maps | ₦0 | Free tier: 28,000 loads/month |
| Domain | ₦400/year | ~₦33/month |
| **Total** | **~₦16,500/month** | |

### Break-Even Analysis

- At ₦1,500/month premium subscription
- Need **11 paying users** to cover infrastructure costs
- Target: 50 paying users in first 30 days

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Government agencies block CivicOne links | Use official URLs, never proxy content; comply with terms of service |
| Users confuse CivicOne with government | Clear branding: "Independent platform — not a government agency" |
| Paystack integration fails | Have manual payment option (bank transfer) as fallback |
| Low user adoption | Focus on SEO, content marketing, and word-of-mouth |
| Data privacy concerns | Minimal data collection, transparent privacy policy, NDPR compliance |

---

## Future Phases (Post-Launch)

### Phase 7: Real Integrations (Months 3-6)

When budget and user base allow:
- Dojah NIN verification adapter
- Dojah CAC lookup adapter
- Real payment processing for government fees

### Phase 8: Agency Partnerships (Months 6-12)

- Formal partnerships with CAC, NIMC, FRSC
- Official API access (if available)
- Commission-based revenue from agency referrals

### Phase 9: Mobile App (Year 2)

- React Native or Flutter app
- Push notifications
- Offline document access
- Biometric login

---

## Summary

| Phase | Duration | Output |
|---|---|---|
| 6A: Smart Service Guide | 1 week | Enhanced service pages with checklists, guides, office locator |
| 6B: Application Companion | 2 weeks | Guided application experience, progress tracking, templates |
| 6C: Payment & Notifications | 2 weeks | Paystack integration, email delivery, in-app notifications |
| 6D: Record Management & Polish | 1 week | Enhanced records, expiry reminders, mobile optimization |
| 6E: Beta Launch | 1 week | Soft launch, feedback iteration, public launch |

**Total: 7 weeks to a fully functional, revenue-generating product that solves real Nigerian problems without government API dependencies.**

---

*Last updated: 2026-09-03*
*Status: Planning*
