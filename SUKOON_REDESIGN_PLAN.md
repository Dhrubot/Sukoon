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

### 1a. Create `SanctuaryView` Component
- Full-screen display showing ONLY the current/next prayer
- Time-aware sky gradient background (reuse `MindfulnessFlow.getPrayerGradient()` logic)
- Large prayer name + countdown timer (from `NextPrayerCard`)
- Single "Prepare Mindfully" CTA button
- Optional: subtle Islamic geometric pattern overlay at low opacity
- **Files:** New `src/components/prayer/SanctuaryView.tsx`

### 1b. Create Expandable Bottom Sheet
- Move all secondary content into a swipeable bottom sheet:
  - Today's Prayers grid
  - SunTimesDisplay
  - MosqueModeStatus (when not active — if active, show above sheet)
  - DailyVerse
- Default state: collapsed (shows just a handle + "Today's Prayers" peek)
- User swipes up to see the detail dashboard
- **Package:** `@gorhom/bottom-sheet` (already common in RN ecosystem)
- **Files:** New `src/components/common/PrayerDetailSheet.tsx`, modify `HomeScreen.tsx`

### 1c. Prayer-Aware Greeting
- Replace generic time-of-day greeting with prayer-contextual text
- Current: "Good morning, Friend ☀️"
- New: "[Prayer name] is approaching, [Name]" or "بِسْمِ اللَّهِ" during active prayer window
- Between prayers: "Peace be upon you, [Name]"
- **File:** `src/screens/Home/HomeScreen.tsx` → `updateGreeting()`

### 1d. Remove Pull-to-Refresh
- Prayer times are deterministic via `PrayerTimesProvider`
- Remove `RefreshControl` from HomeScreen `ScrollView`
- Add silent auto-refresh on app foreground (already exists via provider)
- **File:** `src/screens/Home/HomeScreen.tsx`

---

## Phase 2: Defuse Gamification [HIGH PRIORITY]
**Goal:** Remove extrinsic motivation patterns that compete with spiritual sincerity (ikhlas).

### 2a. Silence Achievement Celebrations
- **Remove** `AchievementCelebration` trigger from:
  - `HomeScreen.handlePrayerComplete()` (line ~148-152)
  - `MindfulnessFlow.completeMindfulness()` (line ~250-254)
- Achievements still unlock in background via `AchievementService`
- User discovers them in Menu > Achievements (already exists)
- Optional: Show a subtle, non-intrusive dot badge on Menu tab when new achievement unlocked
- **Files:** `HomeScreen.tsx`, `MindfulnessFlow.tsx`, `TabNavigator.tsx`

### 2b. Redesign QuickStats → Gentle Progress Indicator
- **Remove** from HomeScreen entirely, OR replace with:
  - A simple "3/5 prayers today" text line (no streak, no milestone)
  - Or a subtle filling crescent moon visual (non-numeric)
- **Remove** streak count, "X to Y!" milestone text, and color-coded streak urgency
- **File:** `src/components/stats/QuickStats.tsx`, `HomeScreen.tsx`

### 2c. Rebrand Achievement Names
- Remove gaming/competition language
- Rename examples:
  - "Comeback King 💪" → "Returning with Hope"
  - "Week Warrior" → "A Week of Devotion"  
  - "Zen Master" → "Deepening Khushu"
  - "Century of Consistency" → "100 Days of Remembrance"
  - "Laser Focus 🎯" → "Present Heart"
  - "Getting Started 🔥" → "First Steps"
- Remove fire/trophy/target emojis, replace with 🌿🤲🌙✨📿
- **File:** `src/services/AchievementService.ts`

### 2d. Demote Stats Tab
- Remove `Stats` from `TabNavigator` (4 tabs → 3 tabs: Prayer, Qibla, More)
- Move `StatsScreen` into `MenuStackNavigator` as "My Journey" or "Reflections"
- Consider replacing with "Duas" tab if a dua library is added later
- **Files:** `TabNavigator.tsx`, `MenuStackNavigator.tsx`, `navigation.ts`

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

### 3b. Soften Typography Weight
- Greeting: `fontWeight: '700'` → `'400'` or `'500'`
- Section titles: `fontWeight: '600'` → `'500'`
- Keep `'700'` only for the prayer name in SanctuaryView
- Principle: "A whisper is more powerful than a shout"
- **Files:** `HomeScreen.tsx` styles, various component styles

### 3c. Add Negative Space
- Increase `marginVertical` between HomeScreen sections
- Reduce border usage (borderWidth: 1 everywhere) — use subtle shadows or transparency
- Let the background gradient breathe through the layout
- **Files:** Various component StyleSheets

---

## Phase 4: Spiritual Transition Experience [MEDIUM PRIORITY]
**Goal:** Create a "digital wudu" — a bridge between phone-world and prayer-world.

### 4a. Entry Transition in MindfulnessFlow
- Before breathing exercise begins, show a 5-second transition:
  - Full-screen prayer gradient
  - Fade in text: "Leave the world behind..."
  - Subtle fade out, then breathing exercise appears
- New FlowStep: `"transition"` before `"breathing"`
- **File:** `MindfulnessFlow.tsx`

### 4b. Post-Prayer Stillness Screen
- Currently: "Ma sha Allah!" → 3-second delay → `navigation.goBack()`
- New: After "Ma sha Allah!", show 5 seconds of:
  - Just the gradient + a softly pulsing light
  - No text, no buttons, no stats
  - Then gentle fade to home
- Extend the `renderCompleteStep()` timeout from 3s to 8s
- **File:** `MindfulnessFlow.tsx`

### 4c. Mosque Mode Activation Overlay
- When mosque mode silences the phone, briefly show:
  - Full-screen semi-transparent overlay
  - "Your phone is at rest 🕌" for 2 seconds
  - Auto-dismiss
- **File:** New `src/components/mosque/MosqueModeOverlay.tsx`

---

## Phase 5: Spiritual Content Depth [LOW PRIORITY]
**Goal:** Give the app genuine Islamic content value beyond time-keeping.

### 5a. Expand DailyVerse Database
- Current: 4 hardcoded verses in `DailyVerse.tsx`
- Target: 100+ verses and hadith about prayer, patience, gratitude, khushu
- Categorize by prayer name (Fajr verses about waking, Isha verses about night reflection)
- Store as JSON data file, not hardcoded
- **Files:** New `src/data/verses.json`, modify `DailyVerse.tsx`

### 5b. Pre-Prayer Dua Suggestions
- In MindfulnessFlow reflection step, suggest contextual duas:
  - Istiftah dua (opening supplication)
  - Dua for entering the mosque
  - Prayer-specific adhkar
- **File:** New `src/data/duas.json`, modify `ReflectionPrompts.tsx`

### 5c. Reflection Garden (Future)
- Replace numeric tracking with organic visual growth
- Past reflections appear as growing plants/flowers in a garden view
- More reflections = denser garden (but no numbers)
- This is a significant feature — scope as a future phase

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

## Status: Phase 3a COMPLETE — Color Palette Overhaul
Last updated: 2026-02-10

### Completed Work
- **Color Palette Overhaul (Phase 3a):** Full psychology-informed color palette designed and implemented. All ~430 hardcoded color instances across ~25+ files replaced with centralized theme tokens via `useThemedStyles` hook. Both dark and light themes updated with warm, spiritual aesthetic. Files converted include: BreathingCircle, MoodSelector, ReflectionPrompts, MindfulnessFlow, OnboardingScreen, AchievementCelebration, AchievementsScreen, StatsScreen, PrayerHabitBuilderSettings, NotificationSettings, LocationSection, NotificationSection, AboutSection, PrayerSettingsSection, CalculationMethodModal, NotificationModal, DigitalWellnessScreen, NotificationDebugScreen, LocationModal, SegmentedControl, QiblaFinderScreen, MosqueModePrompt, MosqueModeStatus, DigitalWellnessCard.
