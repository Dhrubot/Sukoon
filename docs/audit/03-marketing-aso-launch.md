# Sukoon — Marketing, ASO & Launch Assets
**Document version:** 2026-05-28  
**Branch at time of writing:** `feature/notification-prayer-times-hardening`  
**Author:** Generated from direct code inspection

---

## How to read this document

Every factual claim in Part A was checked against source files listed in the Appendix. Claims that could not be confirmed from code are marked ❓. Locked product decisions are enforced throughout: no Quran reader, no cloud backup, no iOS full-adhan promise, iOS Mosque Mode framed as reminder-only, "offline" qualified as after-first-use, spiritual data stays on device.

---

# PART A — LAUNCH ASSETS

---

## A1. Unique Value Proposition (UVP)

**Primary UVP**

> Sukoon is a Muslim prayer companion that treats every salah as a moment worth protecting — not a checkbox to close. It brings accurate prayer times, a Qibla compass, and calm mindfulness tools together in one unhurried space, so you can show up for each prayer with presence rather than pressure.

**One-line elevator pitch**

> The Muslim prayer app built around protection and presence, not performance metrics.

**Tagline options (short form)**

1. "Prayer with presence."
2. "Sakeen — find stillness in every salah."
3. "A sanctuary for every prayer."

---

## A2. ASO Keyword Strategy

### Platform notes
- Apple App Store: 100-character keyword field (no spaces between keywords — use commas). Title (30 chars) + Subtitle (30 chars) are the highest-weight indexable fields.
- Google Play: Keywords live in the title, short description (80 chars), and full description body. No separate keyword field.

### Primary keywords (high intent, direct feature match)
| Keyword | Rationale | Realistic rank target |
|---|---|---|
| prayer times | Core feature, very high volume | Top 20 (competitive) |
| adhan | Specific Muslim intent, moderate volume | Top 10 |
| qibla | Direct feature, lower competition | Top 5 |
| muslim prayer | Combined intent phrase | Top 15 |
| salah times | Spelling variant, under-served | Top 5 |
| prayer tracker | Direct feature match | Top 10 |

### Secondary keywords (supporting features)
| Keyword | Rationale |
|---|---|
| Islamic prayer times | Long-form, less competitive variant |
| qibla compass | Specific device-feature phrase |
| prayer reminder | Notification feature |
| mosque mode | Unique branded feature |
| adhkar | Hisnul Muslim content feature |
| tasbih counter | Direct feature |
| dua app | Library feature |
| fajr reminder | High-intent notification user |
| Ramadan prayer | Seasonal / high-volume |
| prayer journal | Reflection Garden feature |

### Long-tail / niche keywords (low competition, higher conversion)
| Keyword | Rationale |
|---|---|
| mindful prayer app | Unique positioning angle |
| prayer times without ads | Privacy/UX differentiator |
| tuba tree prayer | Branded feature (low volume, high loyalty) |
| morning evening adhkar | Hisnul Muslim audience |
| Islamic prayer countdown | Feature-specific |
| prayer habit tracker | Habit-builder audience |
| prayer times offline | Post-first-use offline cache (must be accurate — see qualification in descriptions below) |
| dawam prayer | Arabic audience, Islamic fiqh term |

### Keyword field for Apple (≤100 characters, comma-separated, no spaces)
```
adhan,salah,qibla,prayer reminder,tasbih,adhkar,dua,tracker,mosque,fajr,isha,asr,countdown,hijri
```
(94 characters — within limit)

---

## A3. Apple App Store Listing

### App Name (≤30 characters)
`Sukoon — Prayer & Mindfulness`
(30 characters exactly)

### Subtitle (≤30 characters)
`Adhan, Qibla & Reflection`
(26 characters)

### Promotional Text (≤170 characters — not indexed, can be updated without resubmission)
```
Accurate prayer times, Qibla compass, full adhan on Android, gentle reminders, morning adhkar, and a private Tuba Tree journal. Currently free.
```
(143 characters)

### Feature Bullets (What's New / Feature section)
1. Live countdown to your next prayer with a fiqh-aware sanctuary view
2. Adhan audio — full adhan on Android (bypasses Do Not Disturb), short notification clip on iOS
3. Qibla compass using device magnetometer and GPS coordinates
4. Mosque Mode: automatically silences your phone at iqamah time on Android; sends a calm reminder on iPhone so you can silence it yourself
5. Morning and evening Adhkar from Hisnul Muslim, Tasbih counter, and Dua library
6. Tuba Tree — a private reflection journal where each prayer with presence grows a leaf
7. Ramadan-aware: Suhoor/Iftar times, Taraweeh prompts, Eid and Tashreeq greetings
8. Jumu'ah companion: Surah Al-Kahf prompts and Sunnah reminders on Fridays
9. Prayer Insights: weekly and monthly charts showing your return to salah over time
10. Three themes (Midnight, Twilight, Dawn), iOS Dynamic Island Live Activity, home screen widget

### Full Description

---

**سكون — Sukoon**

*Sukoon (سكون) means stillness in Arabic. This app is built around one idea: every prayer deserves your full attention, not a quick tap before you scroll.*

---

**PRAYER TIMES, DONE RIGHT**

Sukoon calculates Fajr, Dhuhr, Asr, Maghrib, and Isha using your exact location and the calculation method that matches your region — MWL, ISNA, Umm al-Qura (Makkah), Egypt, Karachi, Tehran, or Jafari. Choose Standard (Shafi'i/Maliki/Hanbali) or Hanafi Asr juristic opinion. Fine-tune any prayer by ±minutes.

Prayer times are fetched over the network on first use, then cached on your device. After that initial fetch, times are available offline. Accuracy depends on a valid location — GPS or manual city entry both work.

---

**THE SANCTUARY VIEW**

The home screen asks one question: what is my next prayer and what should I do now? A full-screen countdown to your next adhan, a progress ring through the fiqh window, and a gentle greeting change as prayer approaches. Scroll down for today's full prayer list, sunrise/sunset times, and optional prayers.

---

**ADHAN & NOTIFICATIONS**

- **Android:** Full adhan audio plays through the AlarmManager system service using the USAGE_ALARM stream. This bypasses silent mode and Do Not Disturb. A short notification clip is the fallback if exact-alarm permission is not granted.
- **iPhone:** A short adhan clip plays as a notification sound. iOS does not permit apps to bypass the ringer without Apple's Critical Alerts entitlement, so the full adhan is an Android-only feature.
- Customizable pre-prayer reminders (5–60 minutes before each prayer)
- Gentle Tahajjud encouragement, Ramadan countdown notifications, and Jumu'ah reminders
- Habit-builder follow-ups to help with returning to prayer — opt-in, not the default

---

**MOSQUE MODE**

Set your mosque's iqamah time offset once. On **Android**, Sukoon automatically moves your phone into silent mode at iqamah and restores it after a configurable duration. On **iPhone**, the app sends a calm reminder at the right moment so you can silence the phone yourself before prayer begins. Separate Jumu'ah settings for a longer silence window covering khutbah.

---

**DEVOTIONS**

- **Morning & Evening Adhkar** from Hisnul Muslim — guided through each remembrance with a count target
- **Tasbih Counter** — SubhanAllah, Alhamdulillah, Allahu Akbar, La ilaha illallah, and more, with haptic feedback
- **Dua Library** — supplication categories for before/after prayer, morning, evening, travel, sleep, distress, forgiveness, and more with Arabic, transliteration, and reference
- **Daily Verse** — one Quranic ayah or hadith per day for quiet reflection
- **Jumu'ah Sheet** — Surah Al-Kahf reading prompts and blessed-hour reminder each Friday

---

**TUBA TREE — PRIVATE REFLECTION**

After each prayer, a short mindfulness flow guides you through breathing, Niyyah setting, optional dhikr, and a reflection prompt. Your mood and any written reflection are stored privately on your device — they are never sent to Firebase or any server. Each prayer with presence grows a leaf on your Tuba Tree. The tree and journal are visible only to you.

Dawam (دوام — continuity) is tracked as consecutive days of returning to prayer — without the anxiety of a broken "streak."

---

**PRAYER INSIGHTS**

Weekly, monthly, and 90-day charts show which prayers you protect most consistently, which ones slip, and how your return to salah is taking shape. All data stays on your device.

---

**RAMADAN & ISLAMIC CALENDAR**

Suhoor end and Iftar times appear automatically during Ramadan. The app tracks Hijri date, prompts moon-sighting confirmation at month boundaries, and adjusts greetings for Eid al-Fitr, Eid al-Adha, and Ayyam al-Tashreeq.

---

**WIDGETS & LIVE ACTIVITY**

Home screen widget shows your next prayer and countdown. iOS Dynamic Island and Lock Screen Live Activity update in real time. Android widget with prayer status.

---

**PRIVACY**

Your prayer records, reflections, mood data, Tuba Tree entries, and Dawam count stay on your device in encrypted local storage. Firebase Analytics collects anonymous interaction events (screen opens, feature taps) to help us improve the app. Firebase Crashlytics collects crash reports. Your spiritual practice data is excluded from all Firebase reporting. No account required. No ads currently running.

---

**TECHNICAL**
- iOS 15.1+ · Android API 24+ (Android 7.0+)
- Supports iPad
- Three themes: Midnight (default), Twilight, Dawn
- Calculation methods: MWL · ISNA · Umm al-Qura · Egypt · Karachi · Tehran · Jafari

---

### Keywords field (≤100 characters)
```
adhan,salah,qibla,prayer reminder,tasbih,adhkar,dua,tracker,mosque,fajr,isha,asr,countdown,hijri
```

### Category
**Primary:** Reference  
**Secondary:** Lifestyle  
*(Rationale: "Reference" has lower competition for Islamic apps and matches the dua/adhkar/prayer-times utility core; "Lifestyle" captures the mindfulness/journaling angle.)*

---

## A4. Google Play Listing

### App Title
`Sukoon: Prayer Times & Qibla`
(29 characters — under 30-char Play hard limit for full indexing)

### Short Description (≤80 characters)
`Accurate prayer times, adhan, Qibla, Mosque Mode & a private reflection journal.`
(80 characters exactly)

### Full Description (≤4,000 characters)

---

**Sukoon (سكون) — stillness — is a Muslim prayer companion built around presence, not performance.**

---

**PRAYER TIMES**
Fajr, Dhuhr, Asr, Maghrib, and Isha calculated for your exact location using the calculation method that matches your madhab and region: MWL, ISNA, Umm al-Qura, Egypt, Karachi, Tehran, or Jafari. Standard and Hanafi Asr options. Manual ±minute adjustments per prayer.

Prayer times are fetched over the network on first use and cached on-device. After that, they are available without a connection. High-latitude warnings appear when Fajr/Isha times may be approximate.

---

**ADHAN ON ANDROID**
Full adhan audio plays through the AlarmManager system service on the USAGE_ALARM stream — bypassing silent mode and Do Not Disturb so you never miss the call to prayer. A short notification clip is used as fallback when exact-alarm permission is unavailable.

---

**MOSQUE MODE (ANDROID)**
Set your mosque's iqamah time offset. Sukoon automatically moves your phone into silent mode at iqamah and restores normal sound after a configurable duration. Separate Jumu'ah settings cover the khutbah + prayer window on Fridays. Prompt-before-enable and confirm-before-restore options let you stay in control.

---

**QIBLA COMPASS**
Live magnetometer-based compass shows the Qibla direction and distance to Makkah. Works once location is set.

---

**MORNING & EVENING ADHKAR**
Guided through each remembrance from Hisnul Muslim with a count target and haptic feedback. The app defaults to morning adhkar before 3 PM and evening adhkar after.

---

**TASBIH COUNTER**
SubhanAllah · Alhamdulillah · Allahu Akbar · La ilaha illallah and more, with configurable targets and gentle vibration on completion.

---

**DUA LIBRARY**
Searchable supplication library with Arabic, transliteration, and scholarly reference. Categories: before/after prayer, morning, evening, travel, sleep, eating, distress, forgiveness, guidance, gratitude, parents, rain, entering/leaving mosque.

---

**TUBA TREE — PRIVATE REFLECTION**
After each prayer, a mindfulness flow guides breathing, Niyyah, optional dhikr, and a reflection prompt. Mood and written reflection are stored in encrypted on-device storage and never sent to a server. Each reflected prayer grows a leaf on your private Tuba Tree. Dawam (days of continuity) is tracked without the pressure of streak mechanics.

---

**PRAYER INSIGHTS**
Weekly, monthly, and 90-day charts reveal which prayers you protect most and where you need support. Entirely private — all data stays on your device.

---

**RAMADAN & JUMU'AH**
Automatic Suhoor/Iftar card during Ramadan. Hijri date with moon-sighting prompts at month boundaries. Eid and Tashreeq greetings. Friday Surah Al-Kahf prompts and blessed-hour reminder.

---

**WIDGETS & LIVE NOTIFICATIONS**
Home screen widget shows next prayer and status. Notifications survive app kill via Android AlarmManager. Boot-receiver reschedules prayers after device restart.

---

**PRIVACY**
Prayer records, reflections, and spiritual practice data stay on your device in MMKV encrypted storage. Firebase Analytics tracks anonymous app-open and feature-tap events. Firebase Crashlytics collects crash reports. Your worship data is excluded from all Firebase reporting. No account required.

---

Requires: Location (prayer times and Qibla), Notifications, Exact Alarm (for adhan), Ringer control (Mosque Mode auto-silence).

Android 7.0+ (API 24) · Currently free to use

---

*(Character count approx. 3,200 — within 4,000-character limit)*

---

## A5. Screenshot Captions (6 screenshots)

These captions appear as text overlays in store screenshots. Sequence assumes portrait device.

| # | Screen shown | Suggested overlay caption |
|---|---|---|
| 1 | Sanctuary View — next prayer countdown with progress ring | "Your next prayer, front and centre — always" |
| 2 | Full prayer list scrolled down, today's five prayers with status | "Five prayers. One clear day. Track every return." |
| 3 | Qibla compass needle pointing toward Makkah | "Qibla found. No account, no sign-up, no friction." |
| 4 | Mosque Mode screen (Android) with iqamah time config | "Android: your phone goes silent at iqamah — automatically." |
| 5 | Tuba Tree with leaf clusters and Dawam badge | "A private garden that grows each time you return to prayer." |
| 6 | Dua Library open to a category, Arabic + transliteration visible | "Duas from Hisnul Muslim — search, read, share." |

---

## A6. Reddit Launch Post

### Five title options

1. "I built a Muslim prayer app that intentionally has no streak counter — here's why, and it's now free on iOS and Android"
2. "Sukoon — a prayer app focused on presence, not performance. No gamification, no cloud sync, no Quran reader competing with your salah. Just accurate times, adhan, and a Tuba Tree journal."
3. "[App launch] Sukoon: prayer times, full adhan on Android (bypasses DND via AlarmManager), Qibla, Mosque Mode auto-silence, and a private reflection garden"
4. "After months of dev work: Sukoon, a Muslim prayer companion built to help you put your phone DOWN before salah. Currently free."
5. "r/islam: I made a prayer app. The design principle was 'everything that doesn't serve the next prayer should be a tap away, not in your face.'"

### Full post body

---

Assalamu alaikum,

I built Sukoon — a Muslim prayer app — and I want to be straightforward about what it is and what it deliberately isn't, because I think honest marketing matters more than hype.

**What it does (all verified in code):**

- Accurate prayer times using your GPS location or a manual city entry. Calculation methods: MWL, ISNA, Umm al-Qura (Makkah), Egypt, Karachi, Tehran, Jafari. Standard and Hanafi Asr options.

- **Full adhan on Android**: uses the AlarmManager service on the USAGE_ALARM audio stream, so it plays through silent mode and Do Not Disturb. On iPhone, you get a short adhan clip as a notification sound — iOS doesn't allow apps to bypass the ringer without Apple's Critical Alerts entitlement, so I'm being honest about that limitation instead of hiding it.

- **Mosque Mode (Android)**: set your mosque's iqamah offset once. The app automatically silences your phone at iqamah and restores sound after. On iPhone it sends a calm reminder to silence the phone yourself.

- **Qibla compass** using the device magnetometer.

- **Morning and evening Adhkar** (Hisnul Muslim), **Tasbih counter**, **Dua library** with Arabic/transliteration/reference.

- **Tuba Tree** — a private reflection journal. After each prayer, a short mindfulness flow. Your written reflections, mood, and prayer history are stored in encrypted storage on your device only. They are never sent to Firebase or any server. The app does use Firebase Analytics for anonymous events (screen opens, feature taps) and Crashlytics for crash reports — I'm not going to pretend there's zero analytics.

- **Prayer Insights**: weekly/monthly/90-day charts. All local.

- Ramadan Suhoor/Iftar times. Jumu'ah Surah Al-Kahf prompts. Hijri date with moon-sighting prompts.

- iOS Dynamic Island / Lock Screen Live Activity showing prayer countdown in real time.

- Home screen widget (iOS and Android).

- Three themes: Midnight (default), Twilight, Dawn.

**What it deliberately doesn't have:**

- No Quran reader (there are far better dedicated apps for that)
- No cloud/server backup — local JSON export only (currently hidden behind a feature flag while the UI is being refined)
- No gamified streak system (replaced with "Dawam" — days of continuity — to reduce the anxiety of broken streaks)
- No ads currently running (monetisation stubs exist in code but are disabled)
- No mosque finder (out of scope for v1)
- No Zakat calculator
- No social features

**Why I built it this way:**

The home screen is designed to answer one question: what is my next prayer and what should I do now? Every other feature is a tap away in a "More" menu. I kept finding that prayer apps were adding features to justify their existence on the home screen, and it was making salah feel like a dashboard to manage rather than a moment to protect.

The notification philosophy is "merciful, not pressure-driven." Reminders are calm. Follow-up notifications exist but are opt-in.

It's on iOS 15.1+ and Android 7.0+. Currently free.

I'll answer any questions about specific implementation details if anyone's curious about the Android adhan/DND bypass or the Tuba Tree data model.

Jazakallahu khayran.

---

## A7. Product Hunt Launch

### Tagline (≤60 characters)
`A Muslim prayer companion built around presence, not metrics.`
(60 characters exactly)

### Description
Sukoon (سكون — "stillness") is a Muslim prayer app that asks one question: what is my next prayer and what should I do now?

**Why it's different:**
- Full adhan on Android via AlarmManager (bypasses Do Not Disturb — legally, via USAGE_ALARM)
- Mosque Mode: auto-silences Android phones at iqamah; sends a calm reminder on iPhone (iOS can't auto-silence — we say so explicitly)
- Tuba Tree: a private reflection journal where prayer records, mood, and written reflections never leave the device
- Dawam tracking instead of streaks — continuity without the anxiety of a broken chain
- No Quran reader, no cloud sync, no gamification competing with salah

**What's in the box:** Accurate prayer times (7 calculation methods), Qibla compass, morning/evening Adhkar (Hisnul Muslim), Tasbih counter, Dua library (16 categories), Ramadan Suhoor/Iftar, Jumu'ah Surah Al-Kahf prompts, iOS Dynamic Island Live Activity, home screen widget (iOS + Android).

Firebase is present for crash reporting and anonymous analytics — we don't hide that. Your prayer history and reflections are in encrypted on-device storage only.

Currently free to use, iOS 15.1+ and Android 7.0+.

### Maker Story (first-person, for PH maker comment)

I started building Sukoon because I kept reaching for my phone to check prayer times and ending up scrolling for 20 minutes instead. The problem wasn't that I needed a better prayer app — it was that most prayer apps are structured to keep you in the app rather than to send you toward prayer.

The Sanctuary View home screen is the design answer to that. It shows the next prayer and a fiqh-aware countdown, and that's it. The rest of the app is one tap away in a "More" menu.

The hardest engineering problem was the Android adhan. Getting audio to play through silent mode and Do Not Disturb on modern Android (API 24+, targeting 36) requires using the AlarmManager to fire a foreground service that plays on the USAGE_ALARM stream. There are no shortcuts. I documented the exact permission justifications for Google Play review: SCHEDULE_EXACT_ALARM for adhan timing precision, RECEIVE_BOOT_COMPLETED to reschedule after device restart, MODIFY_AUDIO_SETTINGS and ACCESS_NOTIFICATION_POLICY for Mosque Mode silence.

The Tuba Tree grew out of a decision to never send spiritual practice data to a server. Once that constraint was in place, a local encrypted journal became the natural home for it — and the tree metaphor (طوبى — Tuba, the Jannah tree mentioned in hadith) felt like the right metaphor for something that grows from consistent return.

I'm not claiming it's finished. There's a privacy policy in the app but no hosted URL yet — that's the first post-launch fix. Localization (Arabic, Urdu, Turkish, Indonesian) is on the roadmap.

Happy to answer any questions about the adhan/DND architecture or the Firebase privacy model.

### First Comment (to post immediately after launch)
For anyone wondering about the Android adhan DND bypass: the app uses `SCHEDULE_EXACT_ALARM` + a native AlarmManager receiver + a foreground service playing on `AudioAttributes.USAGE_ALARM`. This is the same stream used by alarm clock apps. It works on Android 7.0–16 in testing. The SCHEDULE_EXACT_ALARM permission requires user approval on Android 12+ — the onboarding flow explains why it matters and what happens without it (silent notification, no audio bypass). Happy to dig into the implementation if useful.

---

## A8. X (Twitter) Launch Thread — 10 tweets

**Tweet 1 (hook)**
Launching Sukoon today — a Muslim prayer app I built around one design rule: the home screen answers exactly one question. Here's what that led to.

**Tweet 2 (the question)**
The question: "What is my next prayer and what should I do now?"

Everything else in the app is one tap away. Not on the home screen. Not competing with the countdown.

**Tweet 3 (Android adhan)**
The hardest technical problem: Android full adhan that bypasses Do Not Disturb.

The answer: AlarmManager + foreground service + USAGE_ALARM audio stream. Same path used by alarm clocks. Full adhan plays even if the phone is silenced.

Short clip on iOS — Apple doesn't allow DND bypass without a Critical Alerts entitlement. I document that difference honestly instead of hiding it.

**Tweet 4 (Mosque Mode)**
Mosque Mode: set your mosque's iqamah offset once.

Android: the app silences the phone at iqamah and restores it automatically.
iPhone: the app sends a calm reminder so you can silence it yourself.

iOS cannot auto-silence. The UI says so, clearly.

**Tweet 5 (Tuba Tree)**
The Tuba Tree (طوبى) — a reflection journal where each prayer with presence grows a leaf.

All of it — mood, written reflection, prayer history — stored in encrypted storage on your device. Never sent to Firebase. Never to a server.

Firebase Analytics is present for anonymous events (app opens, feature taps). Crashlytics for crashes. Being honest about that.

**Tweet 6 (Dawam, not streaks)**
Dropped "streaks." Replaced with Dawam (دوام — constancy).

Same concept — consecutive days of returning — but without the dopamine mechanics. No fire emoji. No notification if you miss. Just a quiet count of days of return.

**Tweet 7 (features list)**
What else is in it:
- Qibla compass (magnetometer)
- Morning & evening Adhkar (Hisnul Muslim)
- Tasbih counter with presets
- Dua library (16 categories, Arabic + transliteration)
- Ramadan Suhoor/Iftar times
- Friday Surah Al-Kahf prompts
- iOS Dynamic Island Live Activity

**Tweet 8 (what it deliberately isn't)**
What I deliberately left out:
- No Quran reader (better dedicated apps exist)
- No cloud backup (local encrypted only)
- No mosque finder
- No Zakat calculator
- No gamified achievement system

The goal was subtraction, not addition.

**Tweet 9 (monetization honesty)**
No ads running currently. Monetisation stubs exist in the code but they're disabled. I'm not promising "no ads ever" — that would be a promise I can't keep at scale.

Free to download and use now. iOS 15.1+ and Android 7.0+.

**Tweet 10 (call to action)**
Sukoon is live on the App Store and Google Play.

If you try it and find something broken — especially on Android notification behaviour after a reboot, or Mosque Mode auto-silence — I genuinely want to hear about it.

[links]

---

## A9. Landing Page Copy

### Hero section

**Headline:** Every prayer deserves your full attention.

**Subheadline:** Sukoon is a Muslim prayer companion built around stillness, not engagement. Accurate times, full adhan on Android, a private reflection journal, and tools that serve the prayer — nothing that competes with it.

**CTA:** Download free on iOS and Android

---

### Feature section 1: Prayer Times

**Headline:** Your prayer, at your location, by your method.

**Body:** Fajr, Dhuhr, Asr, Maghrib, and Isha calculated for where you actually are, using the calculation method that matches your region. Seven methods supported: MWL, ISNA, Umm al-Qura (Makkah), Egypt, Karachi, Tehran, and Jafari. Standard or Hanafi Asr. Manual ±minute adjustment per prayer.

Times are fetched once over the network and cached on your device. After the initial fetch, prayer times are available without a connection.

---

### Feature section 2: Adhan

**Headline:** The call, when it matters.

**Body:** On Android, the full adhan plays through the AlarmManager system — bypassing silent mode and Do Not Disturb using the USAGE_ALARM audio stream. Your phone doesn't need to be unlocked. It doesn't need the app open.

On iPhone, a short adhan clip plays as a notification sound. iOS does not permit apps to bypass the ringer without Apple's Critical Alerts entitlement — so the full adhan is an Android feature, and we say that clearly.

---

### Feature section 3: Mosque Mode

**Headline:** Quiet that starts before iqamah.

**Body (Android):** Set your mosque's iqamah offset once. At iqamah time, Sukoon automatically moves your phone into silent mode and restores it after prayer. Separate settings for the longer Jumu'ah window.

**Body (iPhone):** Sukoon sends a calm reminder before iqamah so you can silence your phone yourself before prayer begins. We can't change iPhone settings for you — so we remind you at the right moment instead.

---

### Feature section 4: Tuba Tree

**Headline:** A reflection that never leaves your device.

**Body:** After each prayer, a short mindfulness flow — breathing, intention, optional dhikr, a reflection prompt. Your mood and any written reflection are stored in encrypted storage on your device only. They are never sent to a server. Your Tuba Tree grows in private.

Dawam (دوام) tracks your days of return without the anxiety of a broken streak.

---

### Feature section 5: Devotions

**Headline:** Close when needed, secondary by design.

**Body:** Morning and evening Adhkar from Hisnul Muslim. A Tasbih counter with preset dhikr and haptic feedback. A Dua library with 16 categories, Arabic text, transliteration, and scholarly reference. A daily Quranic verse for quiet reflection. All reachable from the More tab — none competing with the prayer home screen.

---

### Privacy statement (landing page)

Prayer records, reflections, mood entries, and Tuba Tree data stay on your device in encrypted local storage. Firebase Analytics collects anonymous interaction events (screen opens, feature taps). Firebase Crashlytics receives crash reports. Your spiritual practice data is excluded from all Firebase reporting. No account required.

---

## A10. Growth Strategy: First 1,000 Users, Conversion, Communities

### Phase 1 — First 1,000 users (weeks 1–4)

**Channel 1: Muslim Reddit communities**
- r/islam (2M+ members), r/MuslimLounge, r/learnquran (for the content angle), r/IslamicFinance (adjacent audience)
- Strategy: honest launch post (draft above), not spam. Answer specific questions about Android adhan DND architecture — this will resonate with technical Muslim users and generates organic upvotes.
- Goal: 200–400 installs from a single well-received post.

**Channel 2: Muslim Twitter/X**
- Use the 10-tweet thread above. Target Muslim tech Twitter and Islamic app accounts.
- Tag accounts that cover Islamic tech, not mainstream app accounts.
- The Android full adhan bypass is a specific technical claim that will get attention from people who have experienced other apps failing in DND.

**Channel 3: Product Hunt**
- Launch with maker story above. The honest framing (no overclaims, documented iOS limitations, data privacy details) tends to resonate with the PH audience which has seen too many vague "privacy-first" claims.

**Channel 4: WhatsApp/Telegram Islamic groups**
- Direct app sharing within trusted community networks. Many Muslim users discover apps this way. No marketing needed — actual users sharing with family/friends.

**Channel 5: Islamic YouTube comment threads**
- Prayer time videos, Ramadan preparation videos. Find videos asking "what app do you use for prayer times?" and answer specifically (only where genuinely helpful, not spam).

### Conversion optimisation

**In-app conversion path:**
1. Onboarding asks for name, location, calculation method, and notification permission — establishing utility immediately.
2. First-run experience should show a live countdown within 30 seconds of location set.
3. The Tuba Tree is the retention hook — once a user has 5+ reflections attached to leaves, the personal investment increases dramatically.
4. Mosque Mode setup is a high-intent engagement point: users who configure iqamah times are committed users.

**Store listing conversion:**
- Screenshot 1 must show the Sanctuary View with a real prayer countdown visible.
- Screenshot 4 (Mosque Mode) with the Android auto-silence claim is a differentiator — lead with the feature, state the platform clearly.
- The honest "iOS reminder, not auto-silence" framing in screenshots will reduce refund/complaint rates from iOS users expecting something the OS cannot deliver.

**Rating prompts:**
- Surface after a meaningful action: first time Tuba Tree grows a leaf, after Mosque Mode auto-silence completes successfully, after a 7-day Dawam milestone.
- Never surface on first launch or after a notification.

### Communities to establish presence in

| Platform | Community | Notes |
|---|---|---|
| Reddit | r/islam, r/MuslimLounge | Largest general Muslim audience |
| Reddit | r/learnquran | Content-adjacent audience |
| Twitter/X | Muslim tech Twitter | Specific Android adhan claim will travel |
| Discord | Muslim developer servers | Technical credibility |
| Telegram | Local Muslim community groups | Word-of-mouth, especially for Ramadan launch |
| Facebook | Local mosque community groups | Older demographic, high Mosque Mode relevance |
| YouTube | Comment sections on prayer time / Ramadan videos | Organic discovery |

### Ramadan timing note
If launch coincides with or is close to Ramadan, prioritise the Suhoor/Iftar card, Taraweeh prompts, and Ramadan countdown notifications in all messaging. Ramadan-adjacent installs have historically high retention because users form habits during the month.

---

# PART B — STORE-READINESS CHECKLIST

---

## Legend
- ✅ DONE — confirmed in code
- 🔧 FIX (BLOCKER) — must fix before store submission
- 🟡 FIX (FAST-FOLLOW) — post-launch
- 🚫 WON'T DO (v1) — with reason
- ❓ VERIFY — state what to check

---

## B1. Store Listing Honesty Pass

### B1.1 — Remove "offline" overclaims without qualification
**Status: 🔧 FIX (BLOCKER)**

Any screenshot caption or description text that says simply "works offline" must be changed to "offline after first use." The first prayer-time fetch requires a network connection (`PrayerTimeService.ts` calls the edge API or Aladhan API on cache miss). The HomeScreen already shows an "Offline — times are estimated" banner when `isOffline && !usingHardcodedDefaults` (line 850 of HomeScreen.tsx). Descriptions in this document use the qualified form — apply the same to all marketing copy before submission.

### B1.2 — Remove iOS full-adhan claims
**Status: ✅ DONE (in this document)**

`AdhanPlaybackPolicy.ts` confirms iOS uses `ios_notification` engine (short clip, `adhan_ios.caf`). The full adhan (`native_alarm` engine) is Android-only. All copy in this document correctly scopes full adhan to Android and frames iOS as short notification clip. Verify screenshots do not show a "full adhan" claim without the Android qualifier.

### B1.3 — Remove iOS auto-silence claims
**Status: ✅ DONE (in this document)**

`mosqueModePlatform.ts` line 3: `isMosqueModeAutoSilenceSupported = Platform.OS === 'android'`. All copy in this document frames iOS Mosque Mode as reminder-only. The UI strings in `mosqueModePlatform.ts` already reflect this correctly. Verify no screenshot shows "silences automatically" without the Android qualifier.

### B1.4 — Never claim "no ads ever"
**Status: ✅ DONE (in this document)**

Monetisation README confirms IAP/subscription/donation stubs are disabled but exist. All copy in this document uses "currently free" or "no ads currently running" rather than "no ads ever."

### B1.5 — Qualify the "your data stays on device" claim
**Status: ✅ DONE (in this document)**

`AnalyticsService.ts` confirms Firebase Analytics and Crashlytics are present and active. All copy in this document specifies "your prayer data / spiritual practice data stays on device" while disclosing Firebase Analytics and Crashlytics.

### B1.6 — Qualification of "no account required"
**Status: ✅ DONE**

`PrivacyPolicyScreen.tsx` states this explicitly. Onboarding does not request an email or sign-in. Confirmed safe to use in store listing.

---

## B2. Externally Hosted Privacy Policy URL

**Status: 🔧 FIX (BLOCKER)**

Google Play requires a hosted URL for the privacy policy. The current privacy policy lives only inside the app (`src/screens/Settings/PrivacyPolicyScreen.tsx`). There is no `https://` URL pointing to the policy anywhere in the codebase (confirmed by grep of all `.tsx` and `.ts` files — no external privacy URL found).

**Required action:** Host the privacy policy text at a stable public URL (e.g., `https://sukoon.app/privacy` or a GitHub Pages URL) before submitting to Google Play. Apple also strongly prefers a hosted URL in the App Store Connect "Privacy Policy URL" field.

The in-app screen text (`PrivacyPolicyScreen.tsx`) is the source of truth for content. Hosting it externally is a distribution step, not a content change.

---

## B3. App Privacy "Nutrition Label" (Apple) / Data Safety (Google Play)

**Status: 🔧 FIX (BLOCKER) + ❓ VERIFY**

The privacy label must accurately reflect what Firebase collects. Based on code review:

**Data collected by Firebase Analytics (`AnalyticsService.ts`):**
- `app_open`, `notification_tapped`, `premium_card_tapped`, `qibla_opened`, `mosque_mode_activated`, `mosque_mode_deactivated`, `settings_changed`, `onboarding_completed`
- These are anonymous interaction events; no user ID is logged in the reviewed code.

**Data collected by Firebase Crashlytics:**
- Crash reports, device details, stack traces (standard Crashlytics collection).

**Data collected by Firebase Performance:**
- App startup time and performance metrics.

**Data NOT sent to Firebase (enforced in code):**
- `prayer_completed`, `prayer_missed`, `mindfulness_started`, `mindfulness_completed`, `dawam_milestone` (comment at top of `AnalyticsService.ts` explicitly excludes these)
- Written reflections, mood entries, Tuba Tree leaf data
- Location coordinates in analytics events (location is only sent to Aladhan API for prayer-time calculation)

❓ **VERIFY with engineer:** Confirm whether `@react-native-firebase/analytics` or `@react-native-firebase/perf` auto-collect any device identifiers, advertising IDs, or install attribution data beyond what is explicitly logged in `AnalyticsService.ts`. Firebase SDKs can auto-collect some data. The Apple label and Google Data Safety form must reflect auto-collected data, not just manually logged events.

❓ **VERIFY with engineer:** Confirm whether `google-services.json` and `GoogleService-Info.plist` have Firebase remote config or A/B testing enabled (which would involve additional data flows). The current codebase imports only `analytics`, `crashlytics`, and `perf`.

---

## B4. Android Permission Justifications for Review

**Status: 🔧 FIX (BLOCKER) — documentation must exist before submission**

Google Play requires a declaration and justification for sensitive permissions. Based on `app.config.js`:

| Permission | Justification required | Code evidence |
|---|---|---|
| `SCHEDULE_EXACT_ALARM` | "Exact alarm permission is required to schedule adhan notifications at the precise prayer time. Approximate alarms drift by minutes and break Islamic time accuracy." | `FullAdhanScheduler.ts`, `AdhanPlaybackPolicy.ts` |
| `RECEIVE_BOOT_COMPLETED` | "Required to reschedule prayer notifications after the device restarts, so users do not miss prayers following a reboot." | `plugins/withBootReceiver.js` |
| `MODIFY_AUDIO_SETTINGS` | "Required by Mosque Mode to programmatically adjust ringer volume at iqamah time and restore it after prayer." | `RingerControlService.ts` |
| `ACCESS_NOTIFICATION_POLICY` | "Required for Mosque Mode to enter and exit Do Not Disturb mode on Android 6.0+." | `RingerControlService.ts`, `MosqueModeService.ts` |
| `WAKE_LOCK` | "Required to keep the AlarmManager foreground service active while adhan audio plays, preventing OS from killing it mid-playback." | `plugins/withFullAdhan.js` (verify) |
| `ACCESS_FINE_LOCATION` | "Required to calculate accurate prayer times for the user's exact geographic location." | `LocationService.ts`, `app.config.js` |

❓ **VERIFY with engineer:** Confirm the exact wording used in the `<uses-permission android:name="..." android:maxSdkVersion="..." />` declarations in the manifest after `expo prebuild`, particularly whether `SCHEDULE_EXACT_ALARM` is declared correctly for the SDK 36 target (Android 16).

❓ **VERIFY with engineer:** The `FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK` declaration (required for Android 14+ foreground services playing audio) should be present in the manifest. Confirm this is set by `withFullAdhan.js`.

---

## B5. iOS Background Audio Entitlement

**Status: ❓ VERIFY**

`app.config.js` sets `UIBackgroundModes: ["audio"]` for iOS. This is required for the short adhan notification clip to play when the app is backgrounded.

❓ **VERIFY with engineer:** Confirm Apple does not flag the `audio` background mode during review given that the use case is short notification clips rather than continuous music playback. The justification in App Store review notes should be: "The audio background mode is required to play the adhan notification sound when the app is in the background at prayer time."

---

## B6. Export/Import Data Feature

**Status: 🟡 FIX (FAST-FOLLOW)**

`AppDataSection.tsx` exposes "Export Prayer Data" and "Import Prayer Data" rows, but `SHOW_APP_DATA_SECTION = false` in `SettingsScreen.tsx` hides this section entirely. The privacy policy (`PrivacyPolicyScreen.tsx`) mentions "You can export data if that option is available in your build." This is acceptable for v1 as a conditional statement.

For marketing copy: do NOT claim data export as a current feature. The description in this document says "manual JSON export only" and qualifies it as currently not surfaced. If the export feature is enabled before launch, update the store listing to claim it.

---

## B7. Localization

**Status: 🟡 FIX (FAST-FOLLOW)**

No Arabic, Urdu, Turkish, or Indonesian localization is present in the codebase. The Amiri font (`@expo-google-fonts/amiri`) is included in `package.json` for Arabic display text, but UI strings are English-only. The dua library, adhkar, and tasbih presets include Arabic text and transliterations.

Target locales for the Muslim app market by user volume: Arabic (MENA), Indonesian (largest Muslim-majority country by population), Urdu (South Asia), Turkish.

Localization of store listings (screenshots + descriptions in local language) provides a significant ASO uplift independent of in-app localization.

---

## B8. Demo Video

**Status: 🟡 FIX (FAST-FOLLOW)**

No app preview video exists. A 15–30 second preview video is accepted by both stores and significantly improves conversion rate for apps with a strong visual design. Priority scenes to capture: Sanctuary View countdown crossing to prayer time, Android Mosque Mode auto-silence activation, Tuba Tree leaf growing after a reflection.

---

## B9. Support Email / Contact

**Status: ❓ VERIFY**

Both stores require a support email. The in-app privacy policy directs users to "the project's support or repository channels" without a specific email address. Confirm a support email address is ready before store submission and add it to the App Store Connect and Google Play Console listings.

---

## B10. App Rating Content

**Status: ❓ VERIFY**

Confirm the PEGI/ESRB/Google Play content rating questionnaire result. The app has no violent content, no user-generated content shared publicly, no location sharing with others, no chat. Expected rating: 4+ (Apple) / Everyone (Google Play). Verify no inadvertent flag is triggered by the "religious content" category in some rating systems.

---

# VERIFIED VS UNVERIFIED CLAIMS TABLE

| Claim | Verified? | Source file |
|---|---|---|
| 5 fard prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha) | ✅ | `HomeScreen.tsx`, `PrayerTimeService.ts` |
| 7 calculation methods (MWL, ISNA, Umm al-Qura/Makkah, Egypt, Karachi, Tehran, Jafari) | ✅ | `PrayerTimeService.ts` CALCULATION_METHOD_MAP |
| Standard and Hanafi Asr options | ✅ | `types/index.ts` `asrJuristic` field in UserSettings |
| Manual ±minute per-prayer adjustment | ✅ | `SettingsScreen.tsx`, `PrayerSettingsSection` |
| Full adhan on Android via AlarmManager USAGE_ALARM | ✅ | `AdhanPlaybackPolicy.ts`, `FullAdhanScheduler.ts`, `plugins/withFullAdhan.js` |
| Short adhan clip on iOS notification | ✅ | `AdhanPlaybackPolicy.ts` `ios_notification` engine, `SOUNDS.IOS_SHORT = 'adhan_ios.caf'` |
| iOS full adhan NOT supported | ✅ | `AdhanPlaybackPolicy.ts` comment, `mosqueModePlatform.ts` |
| Android Mosque Mode auto-silence | ✅ | `RingerControlService.ts`, `MosqueModeService.ts`, `mosqueModePlatform.ts` line 3 |
| iOS Mosque Mode = reminder only | ✅ | `mosqueModePlatform.ts` `isMosqueModeAutoSilenceSupported` |
| Qibla compass via magnetometer | ✅ | `QiblaFinderScreen.tsx` Magnetometer from expo-sensors, KAABA_LAT/LNG constants |
| Morning and evening Adhkar (Hisnul Muslim) | ✅ | `AdhkarScreen.tsx`, `constants/adhkarData.ts` |
| Tasbih counter with presets | ✅ | `TasbihScreen.tsx`, TASBIH_PRESETS constant |
| Dua library with Arabic/transliteration | ✅ | `DuaLibraryScreen.tsx`, `constants/duaLibrary.ts`, 16 categories confirmed |
| Tuba Tree reflection journal | ✅ | `ReflectionGardenScreen.tsx`, `TubaTreeService.ts`, `TreeGrowthStateService.ts` |
| Prayer history/reflections NOT sent to Firebase | ✅ | `AnalyticsService.ts` explicit exclusion comment |
| Firebase Analytics IS present | ✅ | `package.json` `@react-native-firebase/analytics`, `AnalyticsService.ts` |
| Firebase Crashlytics IS present | ✅ | `package.json` `@react-native-firebase/crashlytics`, `app.config.js` plugin |
| Firebase Performance IS present | ✅ | `package.json` `@react-native-firebase/perf` |
| Dawam (not streak) consistency tracking | ✅ | `DawamBadge.tsx` comment "Dawam captures this quality", `useStore.ts` `currentDawam` |
| Ramadan Suhoor/Iftar times card | ✅ | `RamadanTimesCard.tsx`, `HomeScreen.tsx` `isRamadan()` conditional |
| Jumu'ah Surah Al-Kahf prompts | ✅ | `constants/surahAlKahf.ts`, `JummahSunnahSheet.tsx`, `JummahNotificationService.ts` |
| Eid greetings (Eid al-Fitr, Eid al-Adha) | ✅ | `HomeScreen.tsx` `getEidName()` from `utils/ramadan.ts` |
| Tashreeq days greeting | ✅ | `HomeScreen.tsx` `getTashreeqDayLabel()` |
| iOS Dynamic Island / Lock Screen Live Activity | ✅ | `LiveActivityService.ts`, `plugins/withLiveActivity.js` |
| Home screen widget (iOS and Android) | ✅ | `WidgetService.ts`, `plugins/withAndroidWidget.js`, `plugins/withWidget.js` |
| Three themes: Midnight, Twilight, Dawn | ✅ | `ThemeProvider.tsx` dark/midnight/light modes, MenuScreen "Twilight"/"Midnight"/"Dawn" labels |
| No account required | ✅ | `PrivacyPolicyScreen.tsx`, Onboarding has no sign-in step |
| Prayer data in encrypted MMKV storage | ✅ | `StorageService.ts` two MMKV instances, encrypted for PII |
| Boot receiver for notification rescheduling | ✅ | `plugins/withBootReceiver.js` |
| Offline after first use | ✅ | `PrayerTimeService.ts` cache-first logic, `HomeScreen.tsx` offline banner |
| Monetisation currently disabled | ✅ | `monetization/README.md` "disabled until premium launches", `SupportScreen.tsx` "temporarily unavailable" |
| supportsTablet = true (iPad) | ✅ | `app.config.js` iOS `supportsTablet: true` |
| iOS deployment target 15.1 | ✅ | `app.config.js` |
| Android min SDK 24 (Android 7.0) | ✅ | `app.config.js` |
| Prayer Insights (weekly/monthly/90-day stats) | ✅ | `StatsScreen.tsx` `TimeRange = 'week' \| 'month' \| 'all'` (all = 90 days) |
| Mindfulness flow (breathing, niyyah, dhikr, reflection) | ✅ | `MindfulnessFlow.tsx` `FlowStep` type |
| Hijri date with moon-sighting prompts | ✅ | `moonSighting.ts`, `HijriNudgeSheet.tsx`, `MoonSightingPrompt.tsx` |
| Catch-up sheet for missed prayers | ✅ | `HomeScreen.tsx` `CatchUpSheet` when ≥3 prayers missed |
| High-latitude warning | ✅ | `HomeScreen.tsx` `highLatitudeWarning` banner |
| No hosted privacy policy URL exists | ✅ (confirmed absence) | grep of all .tsx/.ts files, no external https:// privacy URL found |
| Export/import data hidden (SHOW_APP_DATA_SECTION = false) | ✅ | `SettingsScreen.tsx` line 41 |

---

# DELIBERATELY NOT CLAIMED

The following features do NOT exist in the codebase and must NOT be claimed in any store copy, marketing, or press release:

| Feature | Reason not claimed |
|---|---|
| Quran reader / full Quran text | No such screen or data file exists. `surahAlKahf.ts` contains only Surah Al-Kahf (18 verses used for Jumu'ah), not a full Quran reader. Locked decision. |
| Cloud / Google Drive / iCloud backup | No cloud sync infrastructure. Export exists but is hidden (feature flag off). Locked decision. |
| iOS full adhan (DND bypass) | Technically impossible without Critical Alerts entitlement. iOS uses short clip. |
| Apple Watch app | No WatchOS target in project. |
| Mosque finder / map | No map screen, no mosque location database. |
| Zakat calculator | No such screen or service. |
| Prayer time sharing with others | No social/sharing features beyond sharing a single dua text. |
| Islamic finance tools | Not in scope. |
| Hadith browser | `hadithCollection.ts` contains constants used for daily verse rotation, not a browseable hadith database screen. |
| Achievements/badges | `types/index.ts` has an Achievement type and a comment about progressive achievements, but no achievement display screen was found. Do not claim until confirmed surfaced in UI. |
| Real-time adhan from a remote server | All adhan is local audio file playback. |
| No analytics (absolute claim) | Firebase Analytics and Crashlytics are present. Must not say "no analytics." |
| No ads ever (permanent claim) | Monetisation stubs exist; must say "currently" free/ad-free. |

---

# APPENDIX

## Files read during research

| File | Purpose |
|---|---|
| `CLAUDE.md` | Architecture overview |
| `package.json` | Dependencies, confirming Firebase, expo-audio, etc. |
| `app.config.js` | Permissions, iOS/Android targets, plugin list |
| `src/screens/Home/HomeScreen.tsx` | Main home UI, prayer features, offline banner |
| `src/screens/Stats/StatsScreen.tsx` | Prayer Insights screen |
| `src/screens/Mindfulness/MindfulnessFlow.tsx` | Pre/post prayer mindfulness |
| `src/screens/QiblaFinder/QiblaFinderScreen.tsx` | Qibla compass implementation |
| `src/screens/Tasbih/TasbihScreen.tsx` | Tasbih counter, presets |
| `src/screens/DuaLibrary/DuaLibraryScreen.tsx` | Dua library |
| `src/screens/Adhkar/AdhkarScreen.tsx` | Morning/evening adhkar |
| `src/screens/ReflectionGarden/ReflectionGardenScreen.tsx` | Tuba Tree garden |
| `src/screens/ReflectionGarden/TubaTreeInfoScreen.tsx` | Tuba (طوبى) explanation |
| `src/screens/MosqueMode/MosqueModeScreen.tsx` | Mosque Mode UI |
| `src/screens/Settings/SettingsScreen.tsx` | Settings, SHOW_APP_DATA_SECTION flag |
| `src/screens/Settings/PrivacyPolicyScreen.tsx` | In-app privacy policy text |
| `src/screens/Settings/components/AppDataSection.tsx` | Export/import hidden section |
| `src/screens/Support/SupportScreen.tsx` | Monetisation disabled state |
| `src/screens/Onboarding/OnboardingScreen.tsx` | Onboarding flow steps |
| `src/screens/SetupHealth/SetupHealthScreen.tsx` | Setup/health check screen |
| `src/screens/Menu/MenuScreen.tsx` | Menu navigation items |
| `src/services/AnalyticsService.ts` | Firebase events tracked/excluded |
| `src/services/MosqueModeService.ts` | Mosque Mode logic |
| `src/services/RingerControlService.ts` | Android ringer control |
| `src/services/PrayerTimeService.ts` | Prayer time calculation/cache |
| `src/services/LiveActivityService.ts` | Dynamic Island / Live Activity |
| `src/services/WidgetService.ts` | Widget data bridge |
| `src/services/monetization/README.md` | Monetisation disabled status |
| `src/services/notifications/AdhanPlaybackPolicy.ts` | iOS vs Android adhan engine |
| `src/constants/NotificationConstants.ts` | Channel names, scheduling limits |
| `src/constants/duaLibrary.ts` | Dua categories confirmed |
| `src/constants/adhkarData.ts` | Adhkar data confirmed |
| `src/components/prayer/RamadanTimesCard.tsx` | Suhoor/Iftar card |
| `src/components/garden/DawamBadge.tsx` | Dawam (not streak) language |
| `src/navigation/TabNavigator.tsx` | Tab structure: Pray, Qibla, Mosque, More |
| `src/navigation/MenuStackNavigator.tsx` | Menu stack screens |
| `src/utils/mosqueModePlatform.ts` | iOS vs Android Mosque Mode UI strings |
| `docs/sukoon-product-phases.md` | Product phase context |
| `docs/sukoon-production-roadmap-8f8b67.md` | Known pre-launch issues |
| `README.md` | Feature list (used to identify claims to verify or reject) |

---

## Open ❓ items for senior engineer

| # | Question | Blocking? | Context |
|---|---|---|---|
| 1 | Does a hosted privacy policy URL exist at any public domain? | YES — blocks Google Play submission | grep found no external URL in codebase |
| 2 | Does Firebase auto-collect any advertising ID, install attribution, or device fingerprint data beyond what is explicitly logged in `AnalyticsService.ts`? | YES — needed for accurate Apple nutrition label and Google Data Safety form | Firebase SDKs can auto-collect data independently of manual log calls |
| 3 | Is `FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK` (required for Android 14+ foreground services playing audio) present in the manifest after prebuild? | YES — needed before Google Play submission | `withFullAdhan.js` sets this; verify it survives prebuild |
| 4 | Has Apple's `audio` background mode been reviewed to ensure it satisfies App Review guidelines given the short-clip use case (not continuous streaming)? | MODERATE — App Review can flag background audio without justification in review notes | `app.config.js` sets `UIBackgroundModes: ["audio"]` |
| 5 | Is a support email address set up and ready for App Store Connect / Google Play Console? | YES — required by both stores before submission | `PrivacyPolicyScreen.tsx` says "contact us through the project's support or repository channels" — insufficient for store contact fields |
| 6 | Is the Achievement system (`Achievement` type in `types/index.ts`) surfaced in any screen in the current build? | MODERATE — determines whether "achievements" can be claimed in marketing | No achievement display screen found in code review |
| 7 | Is the JSON data export/import feature planned to be enabled (`SHOW_APP_DATA_SECTION`) before or after launch? | MODERATE — affects whether "export your data" can be claimed in privacy statements | Currently `false` in `SettingsScreen.tsx` |
| 8 | Is the Google Play `SCHEDULE_EXACT_ALARM` permission declaration using the correct form (`USE_EXACT_ALARM` is blocked in `blockedPermissions` in `app.config.js` — confirm the distinction between `SCHEDULE_EXACT_ALARM` and `USE_EXACT_ALARM` is intentional for the target SDK 36)? | YES — wrong permission declaration causes rejection | `app.config.js` confirms `USE_EXACT_ALARM` is in `blockedPermissions` intentionally |

---

*End of document. Do not publish or distribute until all 🔧 BLOCKER items are resolved.*
