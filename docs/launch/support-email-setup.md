# Sukoon Support Email — Setup Guide

Both Apple App Store and Google Play require a working support email address before app review. This guide covers three options ranked by quality, an autoresponder template, and inbox triage advice for a solo developer.

---

## Why This Is a Store Requirement

Apple App Review Policy (§2.3.9 and the review metadata form) requires a valid support URL or email that reviewers can reach. Google Play requires a "support email address" in the store listing — the field is mandatory before submitting a new app. If the address bounces or is unreachable, review can be rejected or the listing can be unpublished.

---

## Option 1: `support@sukoon.app` — Recommended

**Best for:** Professional credibility, domain-branded experience, long-term scalability.

**Requirements:** You own or can register the `sukoon.app` domain.

### Setup steps

1. **Register the domain** at any registrar (Cloudflare Registrar, Namecheap, Porkbun). `sukoon.app` is a `.app` TLD — check availability and register for ~$18/year.

2. **Add email forwarding or a mailbox:**
   - **Cheapest path (forwarding only):** Use Cloudflare Email Routing (free) to forward `support@sukoon.app` to your personal Gmail. No paid plan needed. Go to Cloudflare dashboard → your domain → Email → Email Routing → Add address → forward to `youremail@gmail.com`.
   - **Full mailbox path:** Use Zoho Mail free tier (up to 5 users, 5 GB) or Google Workspace ($6/month) to host `support@sukoon.app` as a real mailbox. This allows replying from `support@sukoon.app` rather than your personal address.

3. **Test it:** Send an email to `support@sukoon.app` and confirm it arrives (either in your forwarding target or the hosted mailbox).

4. **Set a reply-from address:** If forwarding to Gmail, set up "Send mail as" in Gmail Settings → Accounts → Add another email address. This lets you reply using `support@sukoon.app` from the Gmail interface.

---

## Option 2: `sukoon.support@gmail.com` — Fastest to Set Up

**Best for:** Launch day when you need something working immediately.

**Requirements:** A Google account.

### Setup steps

1. Go to [accounts.google.com/signup](https://accounts.google.com/signup).
2. Create a new Gmail account: `sukoon.support@gmail.com` (check availability — try `sukoon.app.support@gmail.com` as a fallback).
3. Do **not** use your personal Gmail for app support — keep it separate so you can hand it off later.
4. Enable 2FA on the account immediately.
5. Set up the autoresponder (see below).

**Limitation:** The `@gmail.com` domain looks less professional than `@sukoon.app`. Plan to migrate to Option 1 before a major press launch or after significant user growth.

---

## Option 3: Google Group — Team-Scalable

**Best for:** When you add contributors or a community moderator.

### Setup steps

1. Go to [groups.google.com](https://groups.google.com) and create a group named `sukoon-support`.
2. This gives you `sukoon-support@googlegroups.com`.
3. Add your personal Gmail as the owner and any future contributors as members.
4. Set the group to "Email list" mode — replies go to the sender, not the whole group.

**Limitation:** `@googlegroups.com` looks less professional; use only as a fallback.

---

## Autoresponder Template

Set this as the automatic vacation/out-of-office reply on whichever email you choose. Keep it calm and warm — matching Sukoon's tone.

---

**Subject:** Re: [Your subject]

Assalamu alaikum,

Thank you for reaching out to Sukoon support.

I've received your message and will get back to you within 2–3 business days. If you're reporting a bug, it helps to include:
- Your device model and OS version
- A brief description of what you expected vs. what happened
- Whether you have notifications enabled and what calculation method you're using

If this is urgent — for example, prayer notifications stopped working before Ramadan — please include that and I'll prioritise it.

Jazakallahu khayran for your patience.

— Sukoon Support

---

**Tip:** Set the autoresponder to send a maximum of one reply per sender every 7 days. This prevents reply loops.

---

## Inbox Triage for a Solo Developer

Early-stage apps typically receive a mix of bug reports, feature requests, and praise. A lightweight system prevents things from slipping:

### Three-label system in Gmail

1. **`needs-action`** — Bug reports, requests for refunds (if IAP is active), anything requiring a reply.
2. **`feature-request`** — Log the request, archive, no reply needed unless you want to engage.
3. **`done`** — Replied and resolved. Archive.

### Weekly triage (15 minutes)

- Scan the inbox on a fixed day each week (e.g., Monday morning).
- Label immediately and batch replies.
- For known bugs, reply with a one-liner: "Thank you — this is a known issue and is being fixed in the next update. I'll mark this resolved when the fix ships."

### Common early-stage email categories

| Category | Volume estimate | Response |
|---|---|---|
| Notification not working on Android | High | Link to the exact-alarm permission settings in onboarding |
| Full adhan not playing on iPhone | Medium | Explain iOS short-clip limitation (keep a canned reply) |
| Mosque Mode not silencing on Samsung/Xiaomi | Medium | Link to battery optimisation settings for OEM |
| Prayer times wrong | Medium | Ask for calculation method, location, and whether GPS or manual |
| General praise / JazakAllahu khayran | Low | A brief genuine reply goes a long way |

### Canned reply folder

Keep a `canned-replies/` folder in Drafts with 5–6 template replies for the most common issues. Gmail Canned Responses (Templates) feature works well for this.

---

## Adding the Support Email to the App Store and Play Console

- **App Store Connect:** In your app's metadata, fill "Support URL" with `mailto:support@sukoon.app` or a hosted support page. The "Marketing URL" field is separate — use your landing page there.
- **Google Play Console:** In the store listing form under "Contact details," enter the support email address directly.

Both stores display this address to users who tap "App support" on the store page.
