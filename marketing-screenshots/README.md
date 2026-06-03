# Marketing screenshots — Sukoon v1

21 hand-curated assets captured from a fresh Android Pixel emulator on
2026-05-29 during the end-to-end smoke test, with location set to Dhaka,
Bangladesh (a Friday — surfaces Jumu'ah-specific UI). Pair with the captions
from `docs/launch/store-listing-final.md` § Screenshot copy.

| # | File | Surface | Caption (suggested) |
|---|---|---|---|
| 01 | `01-splash-night.png` | Native splash | "A calmer way to return to prayer." |
| 02 | `02-onboarding-location.png` | Onboarding · Location | "Everything else can wait." |
| 03 | `03-qibla-compass.png` | Qibla tab | "Find your direction with a compass built for clarity." |
| 04 | `04-mosque-mode-journey.png` | Mosque Mode | "Sukoon silences your phone at iqamah and restores it after." |
| 05 | `05-more-hub.png` | More tab | "Private reflection. Real devotion. No noise." |
| 06 | `06-settings-calculation.png` | Settings · Calculation | "Calculation method, juristic timing — in plain language." |
| 07 | `07-settings-notifications.png` | Settings · Notifications | "Adhan plays even when your phone is locked." |
| 08 | `08-settings-app-data.png` | Settings · App Data | "Your prayer data stays on your device." |
| 09 | `09-export-redaction-modal.png` | Export consent | "Personal data redacted by default. You decide what leaves." |
| **10** | `10-home-jumuah-hijri-prompt.png` | Hijri confirm | "We ask before assuming the date — different communities sight differently." |
| **11** | `11-sanctuary-jumuah-hero.png` | Sanctuary · Jumu'ah | "One prayer at a time." |
| 12 | `12-todays-prayers-list.png` | Prayers list | "Real prayer times for your real city." |
| **13** | `13-fiqh-aware-jumuah-guidance.png` | Fiqh prompt | "The app refuses to start a fard prayer before its time." |
| 14 | `14-mindfulness-breathing.png` | Breathing | "Three deep breaths before salah." |
| **15** | `15-niyyah-set-intention.png` | Niyyah | "I intend to pray Fajr for the sake of Allah." |
| **16** | `16-your-phone-can-wait.png` | Praying | "Your phone can wait. Your body is here. Let your heart arrive too." |
| 17 | `17-dhikr-astaghfirullah.png` | Post-salah dhikr | "أَستَغفِرُ اللَّه — sourced from Sahih Muslim." |
| 18 | `18-dhikr-allahumma-antas-salaam.png` | Post-salah dhikr | "Authentic Hisnul Muslim adhkar. No invented Islamic content." |
| 19 | `19-dnd-permission-prompt.png` | DND consent | "We always explain why before asking." |
| **20** | `20-tuba-tree-seedling.png` | Tuba Tree | "A private witness to prayer, return, and reflection." |
| 21 | `21-adhkar-ayat-al-kursi.png` | Morning adhkar | "Morning + evening adhkar with Arabic, transliteration, translation." |

**Bold rows** are the strongest hero screenshots — each shows something no
competitor has.

## Recommended Apple/Play 6-shot pack

If forced to pick six, this is my honest order — every one of these tells a
single, distinct, defensible story:

1. **`11-sanctuary-jumuah-hero.png`** — sets the visual mood instantly
2. **`16-your-phone-can-wait.png`** — the differentiation in one frame
3. **`04-mosque-mode-journey.png`** — the "auto silence at iqamah" feature
4. **`20-tuba-tree-seedling.png`** — the habit-loop story
5. **`09-export-redaction-modal.png`** — the privacy story
6. **`03-qibla-compass.png`** — utility credibility (familiar territory)

## Notes for production

* Captures are from a dev build, so a small floating "Tools" gear sits in the
  top-right of most shots. Disable it in the Expo dev menu or shoot from a
  release build before the final upload.
* iOS shots need their own pass on a Simulator with an iPhone 15 Pro / 17 Pro
  device frame.
* Locale: device language was English. Arabic / Turkish / Indonesian / Urdu
  shoots will need separate passes once those locales ship.
* The Hijri date in `10-home-jumuah-hijri-prompt.png` reflects today's
  emulator date. For Apple-policy compliance (no time-sensitive content in
  permanent screenshots), regenerate or post-process the date strip if the
  reviewer flags it.
