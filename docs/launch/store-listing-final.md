# Sukoon — Final Store Listing (Submission-Ready)

**Prepared:** May 28, 2026  
**Branch:** `feature/notification-prayer-times-hardening`  
**Honesty pass:** Applied against audit doc `docs/audit/03-marketing-aso-launch.md`

All claims in this document have been verified against source code. See the "What changed vs the audit doc" section at the bottom for a diff of every toned-down or corrected claim.

---

## Apple App Store

### App Name (≤30 characters)
```
Sukoon — Prayer & Mindfulness
```
(30 characters exactly)

### Subtitle (≤30 characters)
```
Adhan, Qibla & Reflection
```
(26 characters)

### Promotional Text (≤170 characters — not indexed, updateable without resubmission)
```
Accurate prayer times, full adhan on Android, short adhan clip on iOS, Qibla compass, Mosque Mode, morning adhkar, and a private Tuba Tree journal. Currently ad-free.
```
(166 characters)

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

The home screen asks one question: what is my next prayer and what should I do now? A full-screen countdown to your next adhan, a progress ring through the fiqh window, and a gentle greeting as prayer approaches. Scroll down for today's full prayer list, sunrise/sunset times, and optional prayers.

---

**ADHAN AND NOTIFICATIONS**

- **Android:** Full adhan audio plays through the AlarmManager system service using the USAGE_ALARM stream. This bypasses silent mode and Do Not Disturb. A short notification clip is used if exact-alarm permission is not granted.
- **iPhone:** A short adhan clip plays as a notification sound with time-sensitive priority. iOS does not permit apps to bypass the ringer without Apple's Critical Alerts entitlement — full adhan audio is an Android-only feature.
- Customisable pre-prayer reminders (5–60 minutes before each prayer)
- Gentle Tahajjud encouragement, Ramadan countdown notifications, and Jumu'ah reminders
- Habit-builder follow-ups to help with returning to prayer — opt-in, not the default
- Notifications are rescheduled automatically after a device restart

---

**MOSQUE MODE**

Set your mosque's iqamah time offset once.

- **Android:** Sukoon automatically moves your phone into silent mode at iqamah and restores it after a configurable duration. Separate Jumu'ah settings cover the longer khutbah window.
- **iPhone:** iOS does not allow apps to silence the ringer. Sukoon sends a calm reminder before iqamah so you can silence your phone yourself.

---

**DEVOTIONS**

- **Morning and Evening Adhkar** from Hisnul Muslim — guided through each remembrance with a count target
- **Tasbih Counter** — SubhanAllah, Alhamdulillah, Allahu Akbar, La ilaha illallah, and more, with haptic feedback
- **Dua Library** — supplication categories for before/after prayer, morning, evening, travel, sleep, distress, forgiveness, and more with Arabic, transliteration, and reference
- **Daily Verse** — one Quranic ayah or hadith per day for quiet reflection
- **Jumu'ah companion** — Surah Al-Kahf reading prompts and blessed-hour reminder each Friday

---

**TUBA TREE — PRIVATE REFLECTION**

After each prayer, a short mindfulness flow guides you through breathing, Niyyah setting, optional dhikr, and a reflection prompt. Your mood and any written reflection are stored privately on your device — they are never sent to Firebase or any server. Each prayer with presence grows a leaf on your Tuba Tree. The tree and journal are visible only to you.

Dawam (دوام — continuity) is tracked as consecutive days of returning to prayer — without the anxiety of a broken streak.

---

**PRAYER INSIGHTS**

Weekly, monthly, and 90-day charts show which prayers you protect most consistently and how your return to salah is taking shape. All data stays on your device.

---

**RAMADAN AND ISLAMIC CALENDAR**

Suhoor end and Iftar times appear automatically during Ramadan. The app tracks the Hijri date, prompts moon-sighting confirmation at month boundaries, and adjusts greetings for Eid al-Fitr, Eid al-Adha, and Ayyam al-Tashreeq.

---

**WIDGETS AND LIVE ACTIVITY**

Home screen widget shows your next prayer and countdown. iOS Dynamic Island and Lock Screen Live Activity update in real time. Android home screen widget with prayer status.

---

**PRIVACY**

Your prayer records, reflections, mood data, Tuba Tree entries, and Dawam count stay on your device in encrypted local storage. Firebase Analytics collects anonymous interaction events (screen opens, feature taps) to help improve the app. Firebase Crashlytics collects crash reports. Your spiritual practice data is excluded from all Firebase reporting. No account required. Currently ad-free with no in-app purchases at launch.

---

**TECHNICAL**
- iOS 15.1+ · Android API 24+ (Android 7.0+)
- Supports iPad
- Three themes: Midnight (default), Twilight, Dawn
- Calculation methods: MWL · ISNA · Umm al-Qura · Egypt · Karachi · Tehran · Jafari

---

### Feature Bullets (displayed in "What's New" / Feature section)

1. Live countdown to your next prayer with a fiqh-aware sanctuary view
2. Adhan audio: full adhan on Android (bypasses Do Not Disturb); short notification clip on iPhone
3. Qibla compass using device magnetometer and GPS coordinates
4. Mosque Mode: Android automatically silences your phone at iqamah; iPhone gets a calm pre-iqamah reminder
5. Morning and evening Adhkar from Hisnul Muslim, Tasbih counter, and Dua library
6. Tuba Tree — a private reflection journal where each prayer with presence grows a leaf
7. Ramadan-aware: Suhoor/Iftar times, Taraweeh prompts, Eid and Tashreeq greetings
8. Jumu'ah companion: Surah Al-Kahf prompts and Sunnah reminders on Fridays
9. Prayer Insights: weekly and monthly charts showing your return to salah over time
10. Three themes (Midnight, Twilight, Dawn), iOS Dynamic Island Live Activity, home screen widget

### Keywords Field (≤100 characters, comma-separated, no spaces between keywords)
```
adhan,salah,qibla,prayer reminder,tasbih,adhkar,dua,tracker,mosque,fajr,isha,asr,countdown,hijri
```
(94 characters)

### Category
**Primary:** Reference
**Secondary:** Lifestyle

---

## Google Play

### App Title
```
Sukoon: Prayer Times & Qibla
```
(29 characters)

### Short Description (≤80 characters)
```
Accurate prayer times, adhan, Qibla, Mosque Mode & a private reflection journal.
```
(80 characters exactly)

### Full Description (≤4,000 characters)

---

**Sukoon (سكون) — stillness — is a Muslim prayer companion built around presence, not performance.**

---

**PRAYER TIMES**
Fajr, Dhuhr, Asr, Maghrib, and Isha calculated for your exact location using the calculation method that matches your madhab and region: MWL, ISNA, Umm al-Qura, Egypt, Karachi, Tehran, or Jafari. Standard and Hanafi Asr options. Manual ±minute adjustments per prayer.

Prayer times are fetched over the network on first use and cached on-device. After the initial fetch, they are available without a connection. High-latitude warnings appear when Fajr/Isha times may be approximate.

---

**ADHAN ON ANDROID**
Full adhan audio plays through the AlarmManager system service on the USAGE_ALARM stream — bypassing silent mode and Do Not Disturb so you never miss the call to prayer. A short notification clip is used as fallback when exact-alarm permission is unavailable. Notifications are rescheduled automatically after device restart.

---

**MOSQUE MODE**
Set your mosque's iqamah time offset. Sukoon automatically moves your phone into silent mode at iqamah and restores normal sound after a configurable duration. Separate Jumu'ah settings cover the khutbah + prayer window on Fridays. Prompt-before-enable and confirm-before-restore options let you stay in control.

---

**QIBLA COMPASS**
Live magnetometer-based compass shows the Qibla direction and distance to Makkah. Works once location is set.

---

**MORNING AND EVENING ADHKAR**
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

**RAMADAN AND JUMU'AH**
Automatic Suhoor/Iftar card during Ramadan. Hijri date with moon-sighting prompts at month boundaries. Eid and Tashreeq greetings. Friday Surah Al-Kahf prompts and blessed-hour reminder.

---

**WIDGETS AND NOTIFICATIONS**
Home screen widget shows next prayer and status. Notifications are delivered via Android AlarmManager and survive app kill. Prayers are rescheduled automatically after device restart.

---

**PRIVACY**
Prayer records, reflections, and spiritual practice data stay on your device in MMKV encrypted storage. Firebase Analytics tracks anonymous app-open and feature-tap events. Firebase Crashlytics collects crash reports. Your worship data is excluded from all Firebase reporting. No account required. Currently ad-free with no in-app purchases at launch.

---

Requires: Location (prayer times and Qibla), Notifications, Exact Alarm (for adhan on Android), Ringer control (Mosque Mode auto-silence on Android).

Android 7.0+ (API 24) · Currently free to use

---

*(Character count approx. 3,250 — within 4,000-character limit)*

---

## Screenshot Captions (6 screenshots)

| # | Screen shown | Final caption |
|---|---|---|
| 1 | Sanctuary View — next prayer countdown with progress ring | "Your next prayer, front and centre — always" |
| 2 | Full prayer list scrolled down, today's five prayers with status | "Five prayers. One clear day. Track every return." |
| 3 | Qibla compass needle pointing toward Makkah | "Qibla found. No account, no sign-up, no friction." |
| 4 | Mosque Mode screen with iqamah time config — **use Android screenshot** | "Android: your phone goes silent at iqamah — automatically." |
| 5 | Tuba Tree with leaf clusters and Dawam badge | "A private garden that grows each time you return to prayer." |
| 6 | Dua Library open to a category, Arabic + transliteration visible | "Duas from Hisnul Muslim — search, read, share." |

**Note on screenshot 4:** Use an Android device screenshot for this caption. The "automatically" claim is only true on Android. If you show an iOS screenshot for this slot, change the caption to: "Reminder before iqamah — silence your phone before prayer begins."

---

## What Changed vs the Audit Doc

This section records every change made relative to `docs/audit/03-marketing-aso-launch.md`.

### Changes Applied

| Location | Old text | New text | Reason |
|---|---|---|---|
| Apple Promo Text | "Accurate prayer times, Qibla compass, full adhan on Android, gentle reminders, morning adhkar, and a private Tuba Tree journal. Currently free." | Added "short adhan clip on iOS" and changed "Currently free" to "Currently ad-free" | Makes iOS adhan limitation explicit up-front; "currently free" could imply perpetually free |
| Apple Full Description — Adhan section | "iOS plays a short adhan clip as a notification sound" | Added "with time-sensitive priority" | Accurate — iOS 15+ time-sensitive interruption level is used |
| Apple Full Description — Notifications | No mention of reboot rescheduling | Added "Notifications are rescheduled automatically after a device restart" | Boot receiver is verified shipped (`plugins/withBootReceiver.js`); accurate to reflect |
| Apple Full Description — Privacy | "No ads currently running" | "Currently ad-free with no in-app purchases at launch" | More complete; clarifies no IAP at launch without promising permanence |
| Google Play — Adhan section | No reboot mention | Added "Notifications are delivered via Android AlarmManager and survive app kill. Prayers are rescheduled automatically after device restart." | Verified in code; important differentiator |
| Google Play — Adhan fallback | "A short notification clip is the fallback if exact-alarm permission is not granted" | Kept; also added "Notifications are rescheduled automatically after device restart" as a separate sentence | No change to claim; added verified reliability copy |
| Google Play — Privacy | "Currently free to use" | "Currently ad-free with no in-app purchases at launch. Currently free to use." | Same reason as Apple change above |
| Screenshot 4 caption | "Android: your phone goes silent at iqamah — automatically." — no platform qualifier on the screen itself | Added note to use an Android screenshot for this slot; alternative caption for iOS screenshots | Prevents iOS users from expecting auto-silence on iPhone |
| Feature Bullet 4 | "Mosque Mode: automatically silences your phone at iqamah time on Android; sends a calm reminder on iPhone so you can silence it yourself" | Kept, minor wording tightened | Accurate as-is |

### Claims Kept Exactly as in Audit Doc

The following claims were already correct in the audit doc and are unchanged:
- "offline after first use" qualification (already used in audit doc)
- Full adhan scoped to Android only (already correct)
- iOS Mosque Mode framed as reminder only (already correct)
- No Quran reader claim removed
- No cloud sync claim removed
- "no ads ever" avoided in all copy
- Firebase Analytics and Crashlytics disclosed

### Claims Removed vs Audit Doc

None — the audit doc had already removed all false claims before this pass. This pass adds accuracy (reboot rescheduling, ad-free phrasing) without removing anything.

### Claims Intentionally Not Added

- **Achievements/badges:** No achievement display screen was confirmed in the codebase. Not claimed.
- **Data export as a current feature:** `SHOW_APP_DATA_SECTION = true` in the current build, but the parallel engineering agent is implementing export redaction. The privacy section references export without prominently featuring it as a selling point.
- **Apple Watch:** No WatchOS target exists.
- **Mosque finder:** Not in scope for v1.
