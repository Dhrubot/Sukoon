# Phase 5: Content Depth & Spiritual Substance

> **Branch:** `premium/phase5-content-depth`
> **Premise:** Sukoon's architecture is solid but its spiritual content library is thin. The MindfulnessFlow is the sanctuary experience — but the "library" around it (duas, adhkar, verses) feels like a demo database. Phase 5 fills it out so the app feels like a real companion, not a prototype.

---

## Current Content Audit

| Content Area | Current Count | Quality | Gap |
|---|---|---|---|
| Quran Verses (`VERSES`) | ~105 | Good — themed, Arabic + translation + reference | Could add hadith collection |
| Duas (`DUAS`) | **10** | Minimal — only 5 occasions | **Critical gap**: no Hisnul Muslim, no browsable library |
| Post-Fard Dhikr (`POST_FARD_DHIKR`) | 7 | Good — authentic references, tap/recite UX | Complete for post-fard; missing standalone dhikr |
| Khushu Quotes | 10 | Good tone | Could expand to 25–30 |
| Reflection Prompts | 20 (4 × 5 prayers) | Good — prayer-specific | Could add seasonal/Ramadan variants |
| Quick Reflections | 5 | Adequate | Fine as-is |
| Morning/Evening Adhkar | **0** | Missing entirely | **Critical gap** |
| Standalone Dhikr/Tasbih | **0** | Only inside MindfulnessFlow | **Major gap** |
| Dua browsing screen | **0** | Duas only show contextually | **Major gap** |

---

## Sub-phases (ordered by impact)

### 5A — Hisnul Muslim Dua Library (HIGH)
**Problem:** 10 hardcoded duas. No browsing. No categories. Users who want to make dua outside prayer have nowhere to go.

**Deliverables:**
1. **New data file:** `src/constants/duaLibrary.ts`
   - Structure: `{ id, category, arabic, transliteration, translation, reference, occasion[] }`
   - Categories: `before_prayer`, `after_prayer`, `morning`, `evening`, `protection`, `forgiveness`, `guidance`, `travel`, `eating`, `sleeping`, `distress`, `gratitude`, `parents`, `rain`, `entering_mosque`, `leaving_mosque`
   - Target: **60–80 authentic duas** from Hisnul Muslim / Sahih collections
   - Each dua must have: Arabic text, transliteration, English translation, hadith/Quran reference
   - Keep existing `DUAS` array for backward compat; new library is the canonical source

2. **New screen:** `src/screens/DuaLibrary/DuaLibraryScreen.tsx`
   - Accessible from Menu (no tab bar change)
   - Category chips at top (horizontal scroll)
   - Searchable by English keyword
   - Each dua card: Arabic (large), transliteration (medium), translation, reference
   - Tap to expand/collapse transliteration
   - Share button per dua (same pattern as DailyVerse)
   - "Dua of the Day" highlight at top (rotates daily)
   - Bookmark/favorite system (persist to MMKV storage)

3. **Wire into existing flows:**
   - `ReflectionPrompts.getContextualDua()` → pull from new library instead of old `DUAS` array
   - DailyVerse companion: optionally show "Daily Dua" alongside daily verse on HomeScreen

**Files to create/modify:**
- `src/constants/duaLibrary.ts` (new)
- `src/screens/DuaLibrary/DuaLibraryScreen.tsx` (new)
- `src/navigation/MenuStackNavigator.tsx` (add route)
- `src/screens/Menu/MenuScreen.tsx` (add menu item)
- `src/components/mindfulness/ReflectionPrompts.tsx` (update dua source)

---

### 5B — Morning & Evening Adhkar (HIGH)
**Problem:** The single most-requested feature in Islamic apps. Sukoon has zero adhkar outside the post-fard dhikr counter. Users need morning (after Fajr) and evening (after Asr/before Maghrib) adhkar routines.

**Deliverables:**
1. **New data file:** `src/constants/adhkarData.ts`
   - Two collections: `MORNING_ADHKAR` and `EVENING_ADHKAR`
   - Structure: `{ id, arabic, transliteration, translation, count, reference, type: 'tap' | 'recite' }`
   - Source: Authentic adhkar from Hisnul Muslim (Chapters 24 & 25)
   - Target: ~15 morning + ~15 evening adhkar items

2. **New screen:** `src/screens/Adhkar/AdhkarScreen.tsx`
   - Reuses `DhikrCounter` UX pattern (tap to count, recite to confirm) — same component, different data
   - Toggle: Morning / Evening (auto-selects based on current time)
   - Progress bar across all items
   - Haptic feedback on completion
   - Completion celebration (subtle, not gamified — "Your morning remembrance is complete")
   - Streaks tracking: "You've completed morning adhkar 5 days in a row" (stored in MMKV)

3. **Smart notifications (optional, low priority):**
   - After Fajr: "Your morning adhkar are waiting" (only if user hasn't opened adhkar screen)
   - Before Maghrib: "Evening adhkar reminder"
   - Respect existing notification intensity settings

**Files to create/modify:**
- `src/constants/adhkarData.ts` (new)
- `src/screens/Adhkar/AdhkarScreen.tsx` (new)
- `src/navigation/MenuStackNavigator.tsx` (add route)
- `src/screens/Menu/MenuScreen.tsx` (add menu item)
- `src/components/mindfulness/DhikrCounter.tsx` (generalize to accept any dhikr data array)

---

### 5C — Standalone Tasbih Counter (MEDIUM)
**Problem:** The DhikrCounter component is excellent UX but locked inside MindfulnessFlow. Users want a free-form tasbih counter for any dhikr at any time.

**Deliverables:**
1. **New screen:** `src/screens/Tasbih/TasbihScreen.tsx`
   - Full-screen, distraction-free tasbih counter
   - Large tap target (full screen or large circle)
   - Configurable dhikr: pick from presets (SubhanAllah, Alhamdulillah, Allahu Akbar, La ilaha illallah, custom)
   - Configurable target count (33, 99, 100, custom)
   - Haptic pulse on each tap, stronger pulse at milestones (33, 66, 99)
   - Running total persisted per day (MMKV)
   - Minimal chrome — just the count, the Arabic, and a reset button
   - Optional: loop mode (auto-reset at target, keep session total)

2. **Access points:**
   - Menu screen entry
   - Quick-action from HomeScreen (small tasbih icon in header or floating)

**Files to create/modify:**
- `src/screens/Tasbih/TasbihScreen.tsx` (new)
- `src/navigation/MenuStackNavigator.tsx` (add route)
- `src/screens/Menu/MenuScreen.tsx` (add menu item)

---

### 5D — Expand Khushu Quotes + Add Hadith Collection (LOW)
**Problem:** Only 10 khushu quotes shown during prayer. After a week of daily use, users see repeats. No hadith content at all — verses are Quran-only.

**Deliverables:**
1. **Expand `khushuQuotes.ts`:** 10 → 30 quotes
   - Add quotes from scholars (Ibn al-Qayyim, Al-Ghazali, Hasan al-Basri) on prayer focus
   - Add Prophetic sayings about salah quality
   - Keep the same gentle, non-preachy tone

2. **New data file:** `src/constants/hadithCollection.ts`
   - Structure: `{ id, arabic, translation, narrator, source, theme }`
   - Target: 40–50 hadith on themes matching existing verse themes (prayer, patience, remembrance, gratitude, mercy, etc.)
   - Authenticated sources only (Bukhari, Muslim, Abu Dawud, Tirmidhi, Nasa'i, Ibn Majah)

3. **Integrate into DailyVerse:**
   - Alternate: some days show a verse, some days show a hadith
   - Or: show both (verse + hadith) in a swipeable card
   - Add "Daily Hadith" label when showing hadith

**Files to create/modify:**
- `src/constants/khushuQuotes.ts` (expand)
- `src/constants/hadithCollection.ts` (new)
- `src/components/common/DailyVerse.tsx` (integrate hadith)

---

### 5E — Remaining Emoji Cleanup in UI (LOW)
**Problem:** Phase 4 cleaned notification titles but some UI components still use emoji for status/decoration.

**Targets:**
- `ReflectionGardenScreen.tsx`: `getTimeIcon()` returns emoji (🌙☀️🌅🌇) → replace with tintable SVG time-of-day icons
- `ReflectionGardenScreen.tsx`: empty state uses 🌱 emoji → replace with SVG seedling icon
- `ReflectionGardenScreen.tsx`: CTA text "Return to prayers 🤲" → remove emoji
- `MindfulnessFlow.tsx`: complete step uses ✨ emoji → replace with subtle animation or SVG
- `MindfulnessFlow.tsx`: "Finished Praying ✓" → use SVG checkmark
- `MindfulnessFlow.tsx`: "Complete ✨" → plain text
- `MindfulnessFlow.tsx`: garden hint "🌱" → text only
- `DailyVerse.tsx`: share text "Shared via Sukoon 🕌" → remove emoji
- Any remaining emoji in JSX across all screens

**Files to modify:**
- `src/screens/ReflectionGarden/ReflectionGardenScreen.tsx`
- `src/screens/Mindfulness/MindfulnessFlow.tsx`
- `src/components/common/DailyVerse.tsx`
- Scan all `.tsx` files for remaining emoji usage

---

## Implementation Order

```
5A (Dua Library)          ████████████  — highest user value, fills critical gap
5B (Morning/Evening)      ████████████  — most-requested Islamic app feature
5C (Tasbih Counter)       ████████      — quick win, reuses existing DhikrCounter UX
5E (Emoji Cleanup)        ████          — cosmetic, fast
5D (Khushu + Hadith)      ████████      — content expansion, no new screens
```

**Estimated effort:** 5A and 5B are the heaviest (new screens + data files). 5C is a focused build. 5D and 5E are content/cosmetic work.

---

## Design Principles for Phase 5

1. **Authenticity first** — Every dua, dhikr, and hadith must have a verified source reference. No invented content.
2. **Sanctuary, not encyclopedia** — The Dua Library should feel like a curated garden, not a reference dump. Warm card UI, not table rows.
3. **Reuse existing patterns** — DhikrCounter's tap/recite UX is proven. Adhkar and Tasbih should extend it, not reinvent.
4. **No new tabs** — All new screens go through Menu. Tab bar restructure is deferred.
5. **Offline-first** — All content is bundled. No API calls for spiritual content.
6. **Respect the quiet** — No achievement popups for completing adhkar. Just a gentle confirmation.

---

## Dependencies / Risks

- **Content accuracy:** Arabic text and hadith grading must be verified against established sources (Hisnul Muslim, Sunnah.com). Budget time for this.
- **DhikrCounter generalization (5B):** Currently tightly coupled to `POST_FARD_DHIKR`. Needs to accept any `DhikrItem[]` array as a prop.
- **Storage:** Bookmarked duas and adhkar streaks need MMKV keys. Follow existing `STORAGE_KEYS` pattern.
- **Bundle size:** ~80 duas + ~30 adhkar + ~50 hadith = modest JSON. No concern.
