# Meanings of Prayer — feature documentation

**Status:** Built on `feature/meanings-of-prayer`. Five commits, ~3,400 lines, 53 passing tests, ready to merge after launch settles.

**Author:** Built across the conversation that produced commits `ec04ddb` → `108b31e`.

---

## 1. What this feature is

A self-contained module that teaches Muslim users the meaning of the words they recite during salah. For a non-Arabic-speaking user (the majority of the global Muslim population), this is the single highest-leverage tool for *khushuʿ* — the focused presence in prayer. Most contemporary scholars (Ibn al-Qayyim historically, Nouman Ali Khan / Yasir Qadhi / Mufti Menk today) describe understanding the recitation as the central practical lever for deepening prayer.

The feature does **not** replace, modify, or interfere with salah itself. Phones cannot be involved during prayer — the feature operates entirely *before* and *after* prayer, as a contemplative reading library that lives in the Reflection Garden and the Menu.

### Why this fit Sukoon specifically

Sukoon was already positioned in the contemplative/private-worship space (Tuba Tree, Reflection Garden, mindfulness sessions). Most prayer apps focus on timings; Sukoon was the natural home for a depth-of-meaning feature. The decoupling design also kept the existing surface untouched — Reflection Garden was modified in ~15 lines.

---

## 2. What ships in v1.1

### Content (23 reflections + 29 word-by-word entries)

**13 prayer-flow recitations** authored from the canonical Sunnah, in salah order:

| Order | Item | Position | Reps | Word-by-word |
|---|---|---|---|---|
| 1 | Du'a al-Istiftah | opening | 1 | — |
| 2 | Ta'awwudh | opening | 1 | — |
| 3 | **Al-Fatihah** | standing | every rak'ah | **29 entries** |
| 14 | Takbir | transition | 5+/rak'ah | — |
| 15 | Tasbih in Ruku | ruku | 3× | — |
| 16 | Sami'allahu liman hamidah | rising | 1 | — |
| 17 | Rabbana wa laka l-hamd | rising | 1 | — |
| 18 | Tasbih in Sujood | sujood | 3× | — |
| 19 | Rabbi-ghfir lī | between sajdahs | 3× | — |
| 20 | Tashahhud | sitting | 1–2× | — |
| 21 | Salawat Ibrahimiyyah | sitting | 1 | — |
| 22 | Du'a before Salam (Four Refuges) | sitting | 1 | — |
| 23 | Taslim | taslim | 2× | — |

Note: Bismillah is folded into Al-Fatihah as ayah 1 (madhab-neutral — recited aloud or silently depending on madhab, but always part of the surah).

**10 short surahs** in Mushaf order (orders 4–13): Al-ʿAṣr (103), Al-Humazah (104), Al-Fīl (105), Quraysh (106), Al-Māʿūn (107), Al-Kawthar (108), Al-Kāfirūn (109), Al-Ikhlāṣ (112), Al-Falaq (113), An-Nās (114).

**Fatihah word-by-word** — 29 word positions across 7 ayat, each with:
- Three-letter Arabic root and root meaning
- Contextual translation
- Rhetorical / grammatical note (e.g. why *Iyyāka* fronts the verb, why *Raḥmān* and *Raḥīm* share root R-H-M but differ in form, why *Māliki* is in genitive case)

### Sources
- **Arabic text**: Tanzil (Uthmani script) for Quranic; verified Sahih al-Bukhari / Sahih Muslim / Abu Dawud / Tirmidhi for hadith-derived recitations
- **English translation**: Saheeh International (2010) — modern standard, freely usable for non-commercial Islamic apps
- **Word-by-word roots**: cross-referenced Lane's Lexicon (public domain) + Tafsir Ibn Kathir abridged + Tafsir as-Saʿdī
- **Reflections**: original prose, written in invitation tone, reviewed against the classical tafsir tradition. Deliberately does NOT name specific groups for *maghḍūb* / *ḍāllīn* (interpretively contested in tafsir literature; the underlying principle is conveyed instead — "knew-and-rejected" vs "sought-and-missed").

### Audio (11 of 23 items)

Mishary Rashid Alafasy recitations bundled as `.m4a` (AAC 96kbps). Sourced from everyayah.com per-ayah archive, concatenated and transcoded via ffmpeg. Total bundle: **4.4 MB**.

| Item | Duration |
|---|---|
| Al-Fatihah | ~46s |
| 10 short surahs | ~5–25s each |

The 12 hadith-derived recitations do not yet have audio (see [Roadmap](#6-roadmap) §6.1). The `MeaningAudioButton` component renders nothing for items without audio — no code change needed when those assets land later.

### UI and discoverability

**Two surfaces today:**

1. **Reflection Garden** — when the user has `preference === 'opted_in'`, the daily `MeaningCard` (variant: `daily`) appears between the stats row and the WeekTimeline. Tapping it navigates to `MeaningDetail` with `source: 'garden'` (for analytics attribution). The `MeaningInvitePrompt` also lives here, self-gating to render only when prompt eligibility says so.
2. **Menu screen** — a new "Meanings" devotion tile alongside Adhkar / Dua / Tasbih, with an open-book SVG icon. Routes to `MeaningsScreen` with `source: 'menu'`.

**MeaningsScreen** (browse):
- Intro line + a "Daily reflection in Garden" toggle (controls preference)
- Search box (filters by translation / transliteration / title)
- Position filter chips (All / Opening / Standing / Ruku / Sujood / Sitting / Taslim)
- `FlatList` of MeaningCards in compact variant

**MeaningDetailScreen** (deep view):
- Position label (e.g. "RUKU")
- Large RTL Arabic text
- Transliteration (italic)
- Recommended-reps badge for tasbihat ("Recited 3×")
- `MeaningAudioButton` (renders when bundled audio exists)
- Translation section
- Reflection section (2–3 sentences of contemplative commentary)
- `WordByWord` component (Fatihah only in v1.1)
- Source citation footer

### Theming

Fully theme-aware across Sukoon's three palettes (`dark` / `light` / `midnight`). Each palette adds a `meanings` color block with 26 tokens covering card surfaces, Arabic typography, transliteration, translation, reflection, search input, filter chips, audio button + progress, and word-by-word card states.

### Preference state machine

Four states, persisted in encrypted MMKV:

| State | Daily card in Garden? | Prompt eligible? |
|---|---|---|
| `unset` (default) | no | yes, after 5 days of usage |
| `opted_in` | yes | no |
| `declined` | no | yes, after 30-day cooldown, max 2 prompts total |
| `knows_meanings` | no | no — terminal |

**Transitions:**
- **5-day invite prompt** in Reflection Garden — three buttons (Version A copy): "Yes, I'd like that" → `opted_in`, "Not right now" → `declined`, "I'm comfortable with the meanings" → `knows_meanings`, "✕" dismiss → `declined`
- **Implicit opt-in** — when a user opens `MeaningsScreen` or `MeaningDetailScreen` while preference is `unset`, it flips to `opted_in` automatically (discoverer is an interested user by definition)
- **Manual toggle** in MeaningsScreen header — ON ↔ OFF maps to `opted_in` ↔ `knows_meanings`

### Daily-rotation algorithm

Deterministic per calendar day:
1. Cached id for the day → return immediately
2. New day → pick from pool excluding the last 14 days' seen ids
3. Hash today's date string → index into pool
4. If the pool is exhausted (all 23 items seen in 14 days) → restart the cycle

Pure function of date and seen-ids list. Test-mockable via `jest.setSystemTime`.

### Telemetry (2 events, privacy-conscious)

Per Sukoon's privacy stance, **no content is logged** — only outcomes:

| Event | Payload | Fires when |
|---|---|---|
| `meanings_prompt_answered` | `{ choice: 'yes' \| 'later' \| 'know' }` | User responds to the 5-day invite prompt |
| `meanings_screen_opened` | `{ source: 'garden' \| 'menu' \| 'direct' }` | User opens Meanings library or detail screen |

Both events are documented in `docs/launch/privacy-policy.md` and `docs/privacy.html`.

---

## 3. Architecture

The whole feature lives at `src/features/meanings/`. External consumers (Reflection Garden, Menu, future Settings) must import only from the module's public `index.ts`:

```
src/features/meanings/
├── index.ts                    # public surface — only sanctioned import point
├── constants.ts                # prompt thresholds, storage keys, defaults
├── assets/
│   ├── audio.d.ts              # `*.m4a` module declaration (numeric asset id)
│   └── audio/                  # 11 bundled .m4a clips (Alafasy)
├── content/
│   ├── schema.ts               # Meaning, WordByWordEntry, MeaningsPreference, etc.
│   ├── index.ts                # aggregates PRAYER_RECITATIONS + SHORT_SURAHS,
│   │                           #   attaches Fatihah wordByWord, sorts by order
│   ├── recitations.ts          # 13 prayer-flow items
│   ├── shortSurahs.ts          # 10 short surahs
│   └── wordByWord/
│       └── fatihah.ts          # 29 word entries for Al-Fatihah
├── services/
│   └── MeaningsService.ts      # singleton — content, preference, daily, prompt
├── hooks/
│   ├── index.ts
│   ├── useMeaningsPreference.ts
│   ├── useDailyMeaning.ts
│   └── useMeaningPromptEligibility.ts
├── components/
│   ├── index.ts
│   ├── MeaningCard.tsx         # `compact` and `daily` variants
│   ├── MeaningInvitePrompt.tsx # self-gating 5-day invite
│   ├── WordByWord.tsx          # RTL chips + detail card
│   └── MeaningAudioButton.tsx  # expo-audio play/pause + progress
├── screens/
│   ├── index.ts
│   ├── MeaningsScreen.tsx      # browse
│   └── MeaningDetailScreen.tsx # deep view
└── __tests__/
    ├── MeaningsService.test.ts   # 28 specs — preference + daily + prompt
    └── ContentIntegrity.test.ts  # 25 specs — data shape + audio bundling
```

### Decoupling pattern

**Rule:** outside the module, callers import only from `src/features/meanings/index.ts`. Internal restructuring is free as long as the public surface holds. Proven in practice: Reflection Garden integration is exactly **~15 lines** that touch only the public exports. Moving the daily card to the Menu row or Home screen later requires changes only in the consumer file.

### Public surface

```ts
// types
export type {
  Meaning, MeaningTranslation, MeaningSource, WordByWordEntry,
  PrayerPosition, LanguageCode,
  MeaningsPreference, PromptAnswer, PreferenceChangeSource,
};

// service
export { MeaningsService };

// constants
export { MEANINGS_CONSTANTS };

// components
export { MeaningCard, MeaningInvitePrompt, WordByWord, MeaningAudioButton };
export type { MeaningCardProps, MeaningCardVariant, ... };

// hooks
export { useMeaningsPreference, useDailyMeaning, useMeaningPromptEligibility };

// screens (registered in MenuStackNavigator)
export { MeaningsScreen, MeaningDetailScreen };
```

### Routes

Two new routes registered in `MenuStackNavigator`:
- `Meanings` — browse list, no params
- `MeaningDetail` — params: `{ id: string; source?: 'garden' | 'menu' | 'direct' }`

---

## 4. Testing

**53 tests across 2 suites, 0.7s runtime, 100% passing.**

`MeaningsService.test.ts` (28 specs)
- Preference state machine — 10 specs (getPreference defaults, setPreference transitions, declined_at stamp, subscriber notifications, analytics wiring for prompt source only)
- Daily-rotation algorithm — 3 specs (cached same-day, advances on new day, seen-window restart)
- Prompt eligibility — 8 specs (5-day gate, 30-day re-prompt cooldown, MAX_PROMPTS cap, opted_in/knows_meanings short-circuit, declined re-prompt timing)
- Implicit opt-in — 6 specs (recordScreenOpen flips unset, idempotent, doesn't override declined, logs analytics with passed source)
- Reset helper — 1 spec

`ContentIntegrity.test.ts` (25 specs)
- Shape — 7 specs (required fields, non-empty translations, Arabic regex match, valid sources)
- Uniqueness & ordering — 3 specs (unique ids, unique orders, sorted ascending)
- Position enum validation — 1 spec
- Specific items — 5 specs (fatihah word-by-word, taslim, tasbih reps)
- Short surahs — 2 specs (all 10 ids present, all standing)
- Fatihah word-by-word — 4 specs (29 entries, sequential positions, root + rootMeaning pairing)
- Audio bundling — 2 specs (Quranic items have numeric assets, hadith items null)
- Source counts — 1 spec (sanity check)

Mocking: `StorageService` is an in-memory map reset per test. `AnalyticsService` is a silent jest mock. `Date` is controlled via `jest.useFakeTimers()` + `jest.setSystemTime()` so daily-rotation determinism is verifiable.

---

## 5. Discoverability flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User opens the app                            │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
                  ┌────────────────┴────────────────┐
                  │                                  │
                  ▼                                  ▼
        Menu tab → Devotions               Reflection Garden
        ┌─────────────────────┐            ┌─────────────────────┐
        │ Adhkar              │            │ ...stats...         │
        │ Dua                 │            │                     │
        │ Tasbih              │            │ (if opted_in)       │
        │ → Meanings ←        │            │ ┌─────────────────┐ │
        │ Daily Verse         │            │ │ Daily reflection│ │
        └──────────┬──────────┘            │ │ — Al-Fatihah    │ │
                   │                       │ └────────┬────────┘ │
                   │                       │          │           │
                   │                       │ ┌────────┴────────┐ │
                   │                       │ │(if eligible)    │ │
                   │                       │ │ Invite prompt   │ │
                   │                       │ │ (5 days+ usage) │ │
                   │                       │ └─────────────────┘ │
                   │                       └─────────────────────┘
                   │                                  │
                   └────────────┬─────────────────────┘
                                ▼
                  ┌──────────────────────────────┐
                  │ MeaningsScreen (browse)      │
                  │ — search, filter, list of    │
                  │   compact MeaningCards       │
                  │ — "Daily reflection" toggle  │
                  └──────────────┬───────────────┘
                                 ▼
                  ┌──────────────────────────────┐
                  │ MeaningDetailScreen          │
                  │ — Arabic + transliteration   │
                  │ — Audio (where available)    │
                  │ — Translation + Reflection   │
                  │ — Word-by-word (Fatihah)     │
                  │ — Source citation            │
                  └──────────────────────────────┘
```

---

## 6. Roadmap

### 6.1 v1.2 — high-priority follow-ups (1–3 weeks of work)

- [ ] **Audio for hadith-derived items** (12 missing clips). Options:
  - Source a reciter recording standalone Sunnah phrases (Mufti Menk, Bilal Assad, or other recognized voice)
  - Commission a custom recording from a qualified qari
  - Generate via a paid TTS that handles tajweed (low quality, last resort)
  Estimated effort: largely sourcing + audio engineering, not code
- [ ] **Bengali translation** (Muhiuddin Khan translation is the standard). Schema already accepts per-language translations — only data additions needed.
- [ ] **Language picker** in Settings (when ≥2 languages exist). UI work: ~half a day.
- [ ] **Word-by-word for tashahhud** — the second-most-recited item after Fatihah (every prayer, sometimes twice). High contemplative value.
- [ ] **Word-by-word for the two tasbihat** (Subhana Rabbiyal Azeem, Subhana Rabbiyal A'la) — each only 3 words, very fast to author.

### 6.2 v1.3 — medium-term enrichment (3–6 weeks of work)

- [ ] **Urdu, Indonesian, Turkish translations** — the largest non-Arabic Muslim populations after English/Bengali.
- [ ] **Word-by-word for the 10 short surahs** — extends the depth experience beyond Fatihah.
- [ ] **Sequential read mode** — audio playback synced to a highlighted-word indicator. Tap a word to seek. The expo-audio scaffolding is already in place; need word-level timing data (manually annotated from existing audio).
- [ ] **Tafseer link-out** — small "Read tafsir" button on each meaning's reflection, opens Quran.com or similar in the in-app browser for users who want depth.
- [ ] **Bookmark to Tuba Tree** — let users save a meaning that resonated; it appears as a journal entry in their tree. Lets the user collect *which* reflections moved them.

### 6.3 v1.4+ — long-term ambition

- [ ] **Pre-prayer micro-meaning** — surface one short reflection (e.g. "In ruku, you'll say *Subḥāna rabbiya l-ʿaẓīm* — Glory to my Lord, the Most Great") immediately before a prayer notification fires. Highest impact for khushuʿ but also the highest risk of cluttering prayer notifications — needs UX testing first.
- [ ] **Personalized rotation** — instead of deterministic-by-date, prioritize meanings the user has spent less time on, or rotate based on which prayer is next.
- [ ] **Themes / collections** — curated multi-meaning paths ("Mercy: how Rahman + Raheem appear across the prayer", "Forgiveness: from Rabbi-ghfir-li to the four refuges").
- [ ] **Audio variety** — let the user choose reciter (Alafasy / Sudais / Husary / etc.).
- [ ] **Live, season-aware surfacing** — Surah Al-Asr highlighted on Friday, Surah Al-Kawthar on Eid days, etc.
- [ ] **Community reflections** (very long-term, requires backend) — opt-in anonymized notes other users left on a particular meaning. Would need careful moderation and a privacy story.

### 6.4 Architecture / quality follow-ups

- [ ] **Decoupling test** — actually move the daily card from Reflection Garden to Menu row in v1.2; the lift should be <5 minutes. If it isn't, the decoupling story has a leak we should fix.
- [ ] **Arabic font bundling** — currently uses system Arabic font. Bundling Amiri Quran or KFGQPC Uthman Taha Naskh would improve typography consistency across Android OEMs and iOS versions. ~500KB bundle delta.
- [ ] **Accessibility pass** — VoiceOver / TalkBack labels for Arabic content. The screen reader behavior on Arabic + RTL needs testing.
- [ ] **Audio licensing audit** — confirm everyayah.com Alafasy recordings are explicitly cleared for app bundling (not just web playback). If not, switch to a guaranteed-free source like Tanzil or a self-recorded reciter.

### 6.5 Outstanding non-code items

- [ ] **Stress test** the daily-rotation algorithm in a real device for ~30 days to confirm UX feels right. The 14-day skip window may want tuning.
- [ ] **User research** with 5–10 Sukoon users (especially non-Arabic-speakers) on the reflection copy tone. Does it land as invitational, or does any line read as prescriptive?
- [ ] **Localize the UI strings** themselves (chip labels, helper text, prompt copy) — currently English-only.

---

## 7. Decisions log

These were live decisions during the build that future work should respect or revisit deliberately:

1. **Audio source = everyayah.com Alafasy 128kbps.** Widely used in non-commercial Islamic apps. Confirmed appropriate but not formally licensed — audit if Sukoon ever monetizes.
2. **Sentence-level translation everywhere except Fatihah.** Fatihah gets word-by-word because (a) it's recited 17×/day so the leverage is highest, (b) Arabic word-level insights (Rahman/Raheem root, Iyyaka exclusivity, Rabb density) are the actual unlock that sentence translation hides.
3. **No identification of *maghḍūb* / *ḍāllīn* with named groups.** Classical tafsir often identifies these with specific religious groups, citing a Tirmidhi hadith — but the identification is interpretively contested. Sukoon conveys the principle without group labels to honor the contested status and avoid divisiveness in an app context.
4. **No "khushuʿ score" or scoring/grading of prayers.** Risks creating *ujb* (vanity) if high, despair if low. Self-reflection happens via Tuba Tree journal entries the user writes, not a quantified meter.
5. **3-option prompt with `knows_meanings` as the terminal "no thanks".** Crucial for respecting Arabic speakers and users who have already done their own learning. Without this option, the feature would feel paternalistic.
6. **Self-gating components.** `MeaningInvitePrompt` and (effectively) `MeaningAudioButton` decide internally whether to render. Consumers don't gate them — keeps the feature easy to mount anywhere.
7. **Encrypted MMKV for preference storage.** Worship preference is personal, not high-frequency. Encrypted store fits.
8. **Two telemetry events only.** Resisted the temptation to add `meanings_audio_played`, `meanings_meaning_viewed`, etc. The two we have (`prompt_answered`, `screen_opened`) are sufficient for product decisions and minimize the privacy footprint.

---

## 8. Where to start when picking this back up

If you're returning to this feature later, in priority order:

1. **Read `src/features/meanings/index.ts`** — that's the public surface; everything else is internal.
2. **Run the tests** — `npx jest src/features/meanings/__tests__` — confirm green.
3. **Try the feature in the running app** — open Reflection Garden after marking a few prayers; the daily card appears once preference is `opted_in`. Or open Menu → Meanings to browse.
4. **Pick a roadmap item from §6** above and treat each as a self-contained PR.

The whole module compiles in isolation — you can refactor any internal file with confidence as long as `index.ts` exports stay stable.
