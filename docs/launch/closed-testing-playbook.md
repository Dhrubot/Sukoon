# Sukoon — Closed Testing Playbook
## (Required by Google Play for personal accounts created after Nov 13, 2023)

**Account type:** Personal · **Account created:** 2024 · Policy applies.

Google requires a 14-day closed test with at least 12 continuously-opted-in testers before the production track unlocks. This playbook covers setup, recruitment, the 14-day soak, and the production access application.

**Critical timeline:** ~3 weeks from build 57 upload to public launch (14-day soak + Google review of the production-access application).

---

## 1. One-time setup in Play Console

Navigate: Play Console → your app → **Test and release → Testing → Closed testing**.

If no closed track exists yet, click **Create track**. Name it `closed-beta-launch` (the name only appears internally; testers see the app name).

### 1a. Configure the testers list

In the new closed track → **Testers** tab:

- Method: **Choose testers method → Email lists**.
- Click **Create email list**. Name it `Sukoon Launch Beta`.
- Add tester emails one per line. **These must be Google accounts** (the email the tester uses to sign into Google Play).
- Save.

### 1b. Get the opt-in link

After the email list is saved, scroll to **How testers join your test** → copy the URL. It looks like:
```
https://play.google.com/apps/testing/com.talukders.sukoon
```

This is the link you'll paste into recruitment messages.

### 1c. Upload AAB to the closed track

Build 57 must be **uploaded to this closed track**, not Internal testing.

When using `eas submit`:
```
eas submit --platform android --latest --track <closed-track-id>
```

The track ID is shown in Play Console (sidebar URL: `.../tracks/<id>/...`). If unclear, upload the AAB manually via Play Console → Closed testing → Create new release.

---

## 2. Tester recruitment (need 12+; aim for 18–20)

Recruit more than 12 to absorb drop-off — if the active opted-in count falls below 12 at any moment, Google's 14-day clock may reset.

### Sources (in rough effectiveness order)

1. **Personal contacts** — family, friends, masjid community, local Muslim WhatsApp groups. Highest response rate.
2. **Twitter / X** — a short pinned post for ~3 days. Tag #BetaTesters and #Muslim hashtags sparingly.
3. **Reddit** — r/Muslim, r/islam (check sub rules for promo-day policies), r/AlphaandBetausers.
4. **Beta exchange sites** — betatesthub.com, betalist.com. Most expect reciprocal testing of another app.

### Copy-paste recruitment message

```
Salam — I'm building Sukoon, a small, private Muslim prayer companion
focused on presence rather than gamification. Prayer times, full adhan,
Qibla, Mosque Mode, and a private reflection journal. No accounts,
no tracking of worship data, no ads.

I need 12+ Android beta testers to opt in for at least 14 days so Google
Play will unlock the production track for me.

What you get:
  • Free full access on Android
  • A say in last-minute polish before launch

What I need from you:
  • Stay opted-in for the full 14 days (you don't have to use it daily —
    just don't leave the test)
  • Optional: open it a couple of times, share any feedback

Opt-in link (must be Android, use the same Google account as your Play
Store):
  https://play.google.com/apps/testing/com.talukders.sukoon

Reply with your Google Play email and I'll add you to the list. Jazak
Allah khair.
```

### Tracking the 14 days

Maintain a simple table — `/tmp/tester-tracking.csv` or a Google Sheet:

| Email | Joined date | Currently in test? | Notes |
|---|---|---|---|
| ... | YYYY-MM-DD | Y / N | "Dropped out 6/12" |

Every 2–3 days, check **Play Console → Closed testing → Testers → Email list** to confirm count is ≥ 12. Re-recruit if anyone drops out.

---

## 3. The 14-day soak

While the 14 days roll, do your own real-device testing in parallel — this is also where the existing packet's §12 "Internal soak" checklist still applies (DND bypass, boot reschedule, lock screen visibility, Qibla compass, Crashlytics zero crashes, etc.).

### Daily monitoring during the soak

| Day | Action |
|---|---|
| 0 | Build 57 uploaded to closed track. Opt-in link sent to first wave of testers. Confirm ≥ 12 enrolled. |
| 1–3 | Send a follow-up nudge to anyone who hasn't joined. Confirm enrollment count daily. |
| 3, 7, 11 | Check Firebase Crashlytics for any crashes from real testers. Each issue with ≥ 2 affected users → fix in build 58, push to closed track. |
| 7 | Mid-soak check-in message to testers ("All going well? Any feedback?"). Optional but helps retention. |
| 14 | Confirm uninterrupted 14-day enrollment of ≥ 12 testers. Apply for production access. |

### If you push a hotfix mid-soak (e.g. build 58)

Pushing a new AAB to the same closed track is allowed. It does **not** reset the 14-day clock — only the tester-enrollment count needs to stay ≥ 12 continuously. Confirm in Play Console "Closed testing → Testers" that the count holds.

---

## 4. Production access application (day 14)

Navigate: Play Console → your app → **Dashboard → Apply for production access**.

Google asks ~4 questions. Below are pre-written answers grounded in Sukoon's actual development. **Customize the tester-count, dates, and any specifics; do not paste verbatim if details don't match what you actually did.**

### Q1. How did you test your app?

```
We ran a 14-day closed beta on the Google Play closed testing track with
[N] continuously-opted-in testers recruited from personal contacts, the
local Muslim community, and beta tester communities. Testers were asked
to use the core flows (prayer notifications, full adhan playback, Qibla
compass, Mosque Mode, manual location entry) on their primary Android
devices and to report any issues via email.

Specific areas of focus during the soak:
  • Prayer notification timing accuracy across devices and timezones
  • Adhan playback under Do Not Disturb on Samsung, Xiaomi, OnePlus, and
    stock Android (notification channel bypass behavior varies by OEM)
  • Qibla compass accuracy in different physical environments
    (steel-framed buildings, vehicles, near electronics)
  • Onboarding clarity for non-Arabic speakers (the app supports English
    UI throughout)
  • Reverse-geocoding accuracy for non-English-locale users (early
    feedback caught a regional calculation-method bug for Bangladesh
    users — see Q2)

We also ran an automated test suite (Jest, 371+ specs) on every commit
covering business logic — calculation methods by region, notification
scheduling, prayer-time arithmetic, daily algorithm determinism, content
integrity, and storage migrations.
```

### Q2. What feedback did you receive and what changes did you make?

```
Three substantive improvements landed from tester feedback during the soak:

1. A tester in Dhaka, Bangladesh reported the app defaulted to MWL
   (Muslim World League) calculation method instead of Karachi, which is
   the regionally-correct standard for South Asia. Investigation traced
   this to the reverse-geocoding service returning country names in the
   local script (e.g. "বাংলাদেশ" rather than "Bangladesh"), which
   bypassed our English-only region matcher. Fixed by adopting ISO 3166-1
   alpha-2 country codes as the primary regional key, with the English
   name as a fallback. A one-shot migration also corrects the settings
   of any user previously bitten by this bug.

2. Multiple testers noted that prayer notifications were too repetitive
   when the user's name was set ("Amina, take a quiet moment before Fajr
   prayer" — same opening every time). We added deterministic-but-varied
   name-prefix logic so the same prayer on the same day always reads the
   same way (no flicker across launches) but different prayers and days
   vary.

3. Onboarding was originally 5 steps including a manual calculation-method
   confirmation. Once the auto-detection bug above was fixed, this step
   became unnecessary friction. We removed it, dropping onboarding to
   4 steps; users can still change their calculation method at any time
   in Settings.

Additional polish: the city-search field in manual location entry now
shows clearer guidance when the user hasn't selected a country yet,
fixing a confusing silent-search edge case multiple testers ran into.
```

### Q3. How does your app provide value to users?

```
Sukoon (سكون, Arabic for "stillness") is a Muslim prayer companion built
around presence rather than gamification. Unlike most prayer apps that
emphasize streaks, leaderboards, and ad-supported content, Sukoon
focuses on:

  • Accurate prayer times calculated for the user's exact location, with
    region-appropriate calculation methods auto-detected (MWL, ISNA,
    Umm al-Qura, Karachi, Egypt, Tehran)
  • Full adhan audio that bypasses silent mode and Do Not Disturb on
    Android via the native AlarmManager — so the call to prayer is
    actually heard
  • A private reflection journal (the "Tuba Tree") that stores worship
    data on-device only; prayer records, reflections, and mood entries
    are never transmitted to any server
  • Qibla compass with magnetic-interference detection and a generous
    aligned-zone that matches real-world phone sensor accuracy
  • A "Mosque Mode" that respectfully silences the phone before iqamah
    using the native Android ringer service

The app has no ads, no in-app purchases at v1 launch, and requires no
account. The privacy policy at https://dhrubot.github.io/Sukoon/privacy.html
documents the data model in detail.
```

### Q4. How are you ensuring quality going forward?

```
We maintain the following ongoing quality processes:

  • A permanent closed testing track on Google Play for early access to
    new builds before promotion
  • An automated test suite that runs on every commit (Jest, currently
    371+ specs)
  • Firebase Crashlytics monitoring with halt-rollout triggers if the
    crash-free users rate drops below 95% in any 24-hour window
  • Firebase Performance monitoring for cold-start time regressions
  • A monitored support inbox (codifizz@gmail.com) with a stated
    5-business-day response SLA for privacy and bug questions
  • Privacy policy + Data Safety form review with every release that
    touches data collection

The sole developer maintains the app actively; updates ship every few
weeks during the v1 stabilisation period and on a more cadenced schedule
thereafter.
```

### After submitting

Google's review of the application typically takes **2–7 business days**. Watch the Play Console dashboard for status updates. If approved, the Production track unlocks; if Google asks for more info, the dashboard will show specific follow-up questions.

---

## 5. Common pitfalls

1. **Dropping below 12 testers** mid-soak — the 14-day continuous-enrollment clock may reset. Over-recruit.
2. **Testers using the wrong Google account** — the opt-in must use the same Google account they're signed into on Play Store. They'll see "This app is not available in your country/device" if mismatched.
3. **Adding testers AFTER starting the soak** — the count is "currently enrolled", not "ever enrolled". A tester added on day 10 still counts toward the 12, but if you finish day 14 with only 11 of the original recruits, the soak isn't complete.
4. **Pushing major changes mid-soak** — fine for bug fixes, but if you completely restructure the app in build 58, Google's reviewer may consider it a different app from what was tested. Keep mid-soak builds tightly scoped.
5. **Forgetting to keep the closed track active** post-launch — Google expects ongoing testing infrastructure. Keep the closed track running after promotion; add new builds there first before pushing to production.

---

## 6. Quick reference — current state

| Item | Value |
|---|---|
| Account type | Personal |
| Account created | 2024 |
| Policy applies | Yes |
| Build 57 upload target | Closed testing track (not Internal) |
| Min testers | 12 continuously enrolled |
| Soak duration | 14 days |
| Production access | Apply after soak; Google reviews 2–7 business days |
| Realistic launch | Day 14 + Google review = **mid-to-late June 2026** |
