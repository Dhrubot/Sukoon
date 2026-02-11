# Sukoon Redesign Plan: From Prayer Tracker to Prayer Sanctuary

## Context
A detailed critique of the app identified that Sukoon currently functions as a "Prayer Productivity Dashboard" rather than a "Prayer Sanctuary." After a thorough codebase review, ~80% of the critique was validated. This plan addresses the real issues while preserving the app's genuine strengths.

---

## What We're Keeping (Strengths)
- **MindfulnessFlow** — Prayer-specific gradients, breathing exercises, reflection prompts, mood selector. This is already the sanctuary experience; it's just buried.
- **Mosque Mode** — Killer feature. Genuine utility that aids focus.
- **BreathingCircle** — Beautiful 4-4-4-2 breathing animation with haptics. Meditative.
- **Dark Mode First** — Appropriate for Fajr/Isha usage.
- **Solid Architecture** — Providers, hooks, Zustand store, write-through caching. Fast and reliable.
- **Prayer time validation** — Grace periods, makeup prayer support, next-prayer logic.

---

## Phase 1: Sanctuary HomeScreen Redesign [HIGH PRIORITY]
**Goal:** When a user opens Sukoon, they should feel stillness, not see a dashboard.

### 1a. Create `SanctuaryView` Component ✅ COMPLETE
- **Done:** Full-screen hero display (55% viewport height) with prayer-aware sky gradients
- **Done:** Large prayer name (48pt, bold), countdown timer, "Prepare Mindfully" CTA with pulse animation
- **Done:** Greeting text integrated into the gradient area
- **Done:** Fallback state when all prayers complete ("Alhamdulillah")
- **Files:** New `src/components/prayer/SanctuaryView.tsx`, modified `HomeScreen.tsx`

### 1b. Secondary Content Below-the-Fold ✅ COMPLETE
- **Done:** All secondary content (prayer grid, sun times, stats, wellness, verse) placed below SanctuaryView in a scrollable layout
- Decided against `@gorhom/bottom-sheet` dependency — native scroll achieves the same "below the fold" effect without added complexity
- SanctuaryView fills the first screen; user scrolls down to see details
- **File:** `HomeScreen.tsx`

### 1c. Prayer-Aware Greeting ✅ COMPLETE
- **Done:** Replaced generic time-of-day greeting with prayer-contextual `getGreeting()` function
- Shows "[Prayer] is approaching, [Name]" within 30 min, "بِسْمِ اللَّهِ — Time for [Prayer]" during active window
- Between prayers: "Assalamu alaykum" / "Peace be upon you"
- **File:** `src/screens/Home/HomeScreen.tsx`

### 1d. Remove Pull-to-Refresh ✅ COMPLETE
- **Done:** Removed `RefreshControl` import and `onRefresh` callback from HomeScreen
- Prayer times auto-refresh via `PrayerTimesProvider`
- **File:** `src/screens/Home/HomeScreen.tsx`

---

## Phase 2: Defuse Gamification [HIGH PRIORITY]
**Goal:** Remove extrinsic motivation patterns that compete with spiritual sincerity (ikhlas).

### 2a. Silence Achievement Celebrations ✅ COMPLETE
- **Done:** Removed `setCelebratingAchievement` trigger from `HomeScreen.handlePrayerComplete()` and `MindfulnessFlow.completeMindfulness()`
- **Done:** Removed `<AchievementCelebration>` render from HomeScreen
- Achievements still unlock silently via `AchievementService.checkAchievements()`
- **Files:** `HomeScreen.tsx`, `MindfulnessFlow.tsx`

### 2b. Redesign QuickStats → Gentle Progress Indicator ✅ COMPLETE
- **Done:** Replaced gamified dashboard (streak, milestone, progress bar, icons) with minimal "X/5 prayers today" + spiritual encouragement
- Messages: "All prayers complete today — Alhamdulillah", "You are remembering Allah today", etc.
- **Files:** `src/components/stats/QuickStats.tsx`, `HomeScreen.tsx`

### 2c. Rebrand Achievement Names ✅ COMPLETE
- **Done:** All 20 achievements rebranded with spiritual language:
  - "Comeback King 💪" → "Tawbah 🕊️", "Week Warrior" → "A Week of Devotion 🌙"
  - "Zen Master" → "The Contemplative 🪷", "Laser Focus" → "Khushu ✨"
  - "Getting Started 🔥" → "Seeds of Habit 🌿", etc.
- **Done:** AchievementsScreen categories rebranded (Streak→Devotion, Mindful→Presence, Focus→Khushu, Special→Blessings)
- **Done:** Tips section replaced with spiritual encouragement
- **Files:** `AchievementService.ts`, `AchievementsScreen.tsx`

### 2d. Demote Stats Tab ✅ COMPLETE
- **Done:** Removed Stats from TabNavigator (4 tabs → 3 tabs: Prayer, Qibla, More)
- **Done:** Added StatsScreen as "My Journey" in MenuStackNavigator
- **Done:** Added "My Journey" menu item to MenuScreen with ProgressTabIcon
- **Done:** Updated QuickStats navigation to point to `Menu > MyJourney`
- **Files:** `TabNavigator.tsx`, `MenuStackNavigator.tsx`, `navigation.ts`, `MenuScreen.tsx`, `QuickStats.tsx`

---

## Phase 3: Warm the Visual Language [MEDIUM PRIORITY]
**Goal:** Shift from "fintech dashboard" to "spiritual sanctuary" aesthetic.

### 3a. Warm the Primary Accent Color ✅ COMPLETE
- **Done:** Replaced cold turquoise `#00C9A7` with warm sage/forest green palette (`#2D8B6F` primary)
- **Done:** Rewrote `src/theme/colors.ts` with psychology-informed palette:
  - Warm sage/forest green primary (calm, grounded)
  - Deep warm navy dark mode background
  - Warm cream/slate light mode background
  - Muted earth tones for prayer colors
  - Gold accents for reverence
- **Done:** Added comprehensive semantic tokens: `mindfulness`, `onboarding`, `achievement`, `prayerGradients`, `chart`, `switch`, `settings`, `gold`
- **Done:** Centralized all hardcoded colors across ~25 components into `useThemedStyles` pattern
- **Done:** Light mode beautified with warm cream tones instead of stark whites
- Remaining hardcoded colors are intentional (ErrorBoundary class component, Android notification channels, shadow `#000` defaults)

### 3b. Soften Typography Weight ✅ COMPLETE
- **Done:** Greeting weight `'700'` → `'400'`, section title `'600'` → `'500'`
- Principle: "A whisper is more powerful than a shout"
- **File:** `HomeScreen.tsx`

### 3c. Add Negative Space ✅ COMPLETE
- **Done:** Increased header padding (`paddingTop: 2xl`), separated section padding into horizontal/vertical
- Let the background gradient breathe through the layout
- **File:** `HomeScreen.tsx`

---

## Phase 4: Spiritual Transition Experience [MEDIUM PRIORITY]
**Goal:** Create a "digital wudu" — a bridge between phone-world and prayer-world.

### 4a. Entry Transition in MindfulnessFlow ✅ COMPLETE
- **Done:** Added `"transition"` FlowStep before `"breathing"`
- Shows "Leave the world behind..." with 2s fade-in, auto-advances to breathing after 4s
- Progress dots hidden during transition
- **File:** `MindfulnessFlow.tsx`

### 4b. Post-Prayer Stillness Screen ✅ COMPLETE
- **Done:** Extended complete screen from 3s to 8s with pulsing ✨ emoji (opacity 0.3→1.0 loop)
- **Done:** Gentle fade-out (1s) before `navigation.goBack()`
- **File:** `MindfulnessFlow.tsx`

### 4c. Mosque Mode Activation Overlay ✅ COMPLETE
- **Done:** Created `MosqueModeOverlay` component — shows "Your phone is at rest 🕌" for 2s on activation
- Uses Modal with fade animation, triggers on `isActive` transition
- **Files:** `src/components/mosque/MosqueModeOverlay.tsx`, `HomeScreen.tsx`

---

## Phase 5: Spiritual Content Depth [LOW PRIORITY]
**Goal:** Give the app genuine Islamic content value beyond time-keeping.

### 5a. Expand DailyVerse Database ✅ COMPLETE
- **Done:** Expanded from 6 verses to 30 covering: prayer, patience, remembrance, gratitude, mercy, taqwa, dua, tawakkul, community, fajr, night prayer, purification, closeness
- **Done:** DailyVerse component now imports from centralized `VERSES` constant
- **Files:** `src/constants/index.ts`, `src/components/common/DailyVerse.tsx`

### 5b. Pre-Prayer Dua Database ✅ COMPLETE
- **Done:** Expanded from 3 duas to 10 covering: before prayer, after prayer, morning, evening, fajr-specific, guidance, gratitude, protection, before sleep, steadfastness
- **File:** `src/constants/index.ts`

### 5c. Reflection Garden ✅ COMPLETE
- **Done:** Full "My Garden" screen — organic visual growth replaces numeric tracking
- **Done:** Prayer-colored emoji plants (Fajr→🪻, Dhuhr→🌳, Asr→🌻, Maghrib→🌺, Isha→🌸) with 3 growth stages (seed/sprout/bloom) based on mood score
- **Done:** GardenCanvas with time-of-day sky gradients, deterministic organic scatter layout, staggered fade-in animations, gentle breathing oscillation
- **Done:** WeekTimeline (Mon-Sun dots), ReflectionJournal (recent entries with prayer-colored accents), tap-to-reveal reflection text
- **Done:** GardenTeaser card on HomeScreen for subtle entry point; "My Garden 🌿" in Menu
- **Done:** Post-prayer feedback in MindfulnessFlow: "A new bloom appeared in your garden 🌱"
- **Done:** Ramadan golden glow on bloom-stage plants; sparkle overlay for text reflections
- **Done:** Beautiful empty state for new users with encouraging CTA
- **Zero numbers anywhere on the garden screen** — visual density is the only metric
- **Files:** `src/types/garden.ts`, `src/services/ReflectionGardenService.ts`, `src/hooks/useReflectionGarden.ts`, `src/screens/ReflectionGarden/ReflectionGardenScreen.tsx`, `src/components/garden/GardenCanvas.tsx`, `src/components/garden/GardenPlantView.tsx`, `src/components/garden/WeekTimeline.tsx`, `src/components/garden/ReflectionJournal.tsx`, `src/components/garden/GardenTeaser.tsx`
- **Modified:** `StorageService.ts` (reflection text cross-ref), `MindfulnessFlow.tsx` (save text + garden hint), `MenuStackNavigator.tsx`, `MenuScreen.tsx`, `HomeScreen.tsx`, `colors.ts` (garden tokens)

---

## Phase 6: "Input Later, Stillness Now" [HIGH PRIORITY]
**Goal:** Never ask the user to type, scroll, or analyze immediately before prayer. Push all cognitive load to *after* the prayer.

### 6a. Pre/Post Prayer Flow Split ✅ COMPLETE
- **Done:** MindfulnessFlow restructured from 4 steps to 6: `transition → breathing → niyyah → praying → reflection → complete`
- **Done:** Niyyah step — minimal intention screen: "I intend to pray [Prayer] for the sake of Allah" + "Begin Prayer 🤲"
- **Done:** Praying step — minimal dark "Prayer in Progress" screen with pulsing 🕌, "Take your time. Allah is listening." + "I've Finished My Prayer ✓"
- **Done:** PrayerRecord saved immediately when entering prayer (if user closes app, prayer is still recorded)
- **Done:** Reflection moved to **post-prayer** — "How was your prayer?" → mood + text → "Complete ✨"
- **Done:** MindfulnessSession + reflection text saved after prayer via `saveMindfulnessSession()` which auto-updates linked PrayerRecord
- **Done:** Progress dots show 3 steps (Breathe · Intend · Reflect), hidden during praying/transition/complete
- **Done:** Gradient background during pre-prayer steps, plain background during praying + reflection
- **Principle:** Pre-prayer experience is strictly passive and guiding. Analytical input happens only after standing before Allah.
- **File:** `MindfulnessFlow.tsx`

### 6b. Ramadan Countdown Notifications ✅ COMPLETE
- **Done:** `RamadanCountdownService` with 10 countdown messages, 6 milestone messages (30/14/7/3/2/1 day), 23 during-Ramadan daily messages
- **Done:** All messages are authentic Islamic quotes (Quran, Hadith) with practical preparation tips
- **Done:** Schedules up to 30 notifications before Ramadan, 14 during Ramadan
- **Done:** Fires daily at 9:00 AM local time; milestone days get special messages
- **Done:** One-per-day guard prevents duplicate scheduling; cancels old before rescheduling
- **Done:** Uses cached Hijri date from Aladhan API (no new API calls)
- **Done:** Dedicated `RAMADAN_COUNTDOWN` Android notification channel
- **Done:** Auto-triggered from `useServiceInitialization` after prayer times load
- **Files:** `src/services/RamadanCountdownService.ts`, `NotificationChannels.ts`, `NotificationConstants.ts`, `useServiceInitialization.ts`

### 6c. Sanctuary Refinement ✅ COMPLETE
- **Done:** Renamed "Prepare Mindfully" → "Prepare for Prayer" across all user-facing text (SanctuaryView, NextPrayerCard, notifications, onboarding)
- **Done:** Renamed "✓ Prayed Mindfully" → "✓ Prayed with Presence" in PrayerCard
- **Done:** Renamed "Mindfulness Rate" → "Presence Rate" in StatsScreen
- **Done:** Removed Achievements from Menu and Navigator (code preserved, just de-surfaced)
- **Done:** Silenced achievement unlock push notification (kept haptic only)
- **Done:** Removed QuickStats from HomeScreen (replaced by GardenTeaser)
- **Done:** Removed DigitalWellnessCard from HomeScreen (accessible via Menu)
- **Files:** `SanctuaryView.tsx`, `NextPrayerCard.tsx`, `PrayerCard.tsx`, `OnboardingScreen.tsx`, `NotificationChannels.ts`, `AchievementService.ts`, `StatsScreen.tsx`, `MenuScreen.tsx`, `MenuStackNavigator.tsx`, `HomeScreen.tsx`

---

## Implementation Order (Recommended)

### Session 1: Quick Wins (2a, 2d, 1d)
1. Silence achievement popups (2a) — 4 lines of code
2. Demote Stats tab (2d) — move to Menu stack
3. Remove pull-to-refresh (1d)

### Session 2: HomeScreen Transformation (1a, 1b)
1. Build SanctuaryView component
2. Implement bottom sheet for detail content
3. Restructure HomeScreen layout

### Session 3: Visual & Emotional Polish (1c, 3a, 3b, 3c)
1. Prayer-aware greeting
2. Color palette shift
3. Typography softening + spacing

### Session 4: Spiritual Transitions (4a, 4b)
1. MindfulnessFlow entry transition
2. Post-prayer stillness screen

### Session 5: Content & Rebranding (2b, 2c, 5a)
1. QuickStats redesign
2. Achievement rebranding
3. Verse database expansion

---

## North Star Principle
> **"Does this feature help the user forget their phone exists, or does it deepen their engagement with the phone?"**
> 
> If it deepens phone engagement, remove it from the primary experience.
> If it helps them disconnect, make it prominent.

---

## Status: ALL PHASES COMPLETE (except 5c Reflection Garden — future)
Last updated: 2026-02-10

### Completed Work
- **Color Palette Overhaul (3a):** Full psychology-informed color palette. ~430 hardcoded colors replaced across ~25+ files.
- **Silence Achievement Celebrations (2a):** Removed popup triggers from HomeScreen and MindfulnessFlow.
- **Demote Stats Tab (2d):** Stats moved to Menu stack as "My Journey". 4 tabs → 3 tabs.
- **Remove Pull-to-Refresh (1d):** Removed RefreshControl from HomeScreen.
- **Prayer-Aware Greeting (1c):** Context-sensitive greeting based on next prayer proximity.
- **Soften Typography (3b):** Greeting `'400'`, section titles `'500'`.
- **Add Negative Space (3c):** Increased spacing between HomeScreen sections.
- **Entry Transition (4a):** "Leave the world behind..." fade-in before breathing exercise.
- **Post-Prayer Stillness (4b):** 8s pulsing glow on complete screen before fade-out.
- **Mosque Mode Overlay (4c):** "Your phone is at rest 🕌" overlay on activation.
- **Redesign QuickStats (2b):** Replaced gamified dashboard with gentle "X/5 prayers today" + spiritual message.
- **Rebrand Achievements (2c):** All 20 achievements renamed with spiritual language, categories rebranded.
- **Expand Verse Database (5a):** 6 → 30 Quran verses across 12 themes.
- **Expand Dua Database (5b):** 3 → 10 duas covering all prayer occasions.
- **SanctuaryView (1a):** Full-screen prayer hero with sky gradients, countdown, pulse CTA.
- **Below-the-Fold Layout (1b):** Secondary content placed below SanctuaryView in native scroll.

### Remaining (Future)
- **Reflection Garden (5c):** Organic visual growth for reflections — significant feature, scoped as future phase.
