## Sukoon Product Phases

This roadmap breaks the redesign into six implementation branches so each phase
has a clear product goal, bounded scope, and reviewable output.

### Branch map

1. `codex/phase1-prayer-focus`
   Goal: make Sukoon feel prayer-first the moment the app opens.
2. `codex/phase2-prayer-loop`
   Goal: reduce phone dependence during and immediately after salah.
3. `codex/phase3-notification-philosophy`
   Goal: rewrite reminder behavior and tone around mercy, not pressure.
4. `codex/phase4-reflection-reframe`
   Goal: keep reflection depth while removing reward-heavy/gamified framing.
5. `codex/phase5-devotion-ia`
   Goal: preserve dua, adhkar, tasbih, and verse content without letting them compete with prayer.
6. `codex/phase6-mosque-mode-flagship`
   Goal: turn Mosque Mode into a premium-grade masjid companion.

### Phase 1: Prayer Focus

Product intent:
- The first screen should answer one question: what is my next prayer and what should I do now?
- The app should stop feeling like a stack of features below the hero.

Scope:
- Make top-level labels read more like a prayer companion than a utility bundle.
- Trim the home secondary layer to essential prayer support.
- Remove non-essential devotional and reflective surfaces from the default home stack.
- Reframe the menu area as companion tools, not the emotional center of the app.

Implementation targets:
- `src/navigation/TabNavigator.tsx`
- `src/screens/Home/HomeScreen.tsx`
- `src/screens/Menu/MenuScreen.tsx`

Exit criteria:
- The default home path emphasizes next prayer and today’s prayer list.
- Reflection, verse, and support content no longer compete with the primary prayer flow on home.
- Navigation labels and menu copy reinforce the product’s prayer-first identity.

### Phase 2: Prayer Loop

Product intent:
- Sukoon should help the user put the phone down before salah, not build more phone interaction around salah.

Scope:
- Rework pre-prayer flow to conclude with device exit.
- Reduce immediate post-prayer re-entry pressure.
- Add mode-aware paths for returning, steadying, and deepening users.

Implementation targets:
- `src/screens/Mindfulness/MindfulnessFlow.tsx`
- `src/components/prayer/QuickLogSheet.tsx`
- `src/components/prayer/PostPrayerSheet.tsx`
- `src/components/prayer/PreAdhanSheet.tsx`

Exit criteria:
- The prayer flow encourages putting the phone away before prayer begins.
- Post-prayer interaction is delayed or softened.
- Returning users have a low-guilt path back into prayer.

### Phase 3: Notification Philosophy

Product intent:
- Notifications should feel trustworthy, calm, and merciful.

Scope:
- Replace habit-builder framing with spiritually humane language.
- Reduce aggressive follow-up defaults.
- Rewrite notification copy and presets around user state.

Implementation targets:
- `src/components/settings/NotificationSettings.tsx`
- `src/components/settings/PrayerHabitBuilderSettings.tsx`
- `src/services/NotificationService.ts`
- `src/utils/notificationPresets.ts`

Exit criteria:
- Reminder settings read as supportive, not compliance-driven.
- Core prayer notification copy is calmer and cleaner.
- Aggressive persistence is opt-in, not the personality of the product.

### Phase 4: Reflection Reframe

Product intent:
- Reflection should feel private and spiritually dignified, not like a collectible reward system.

Scope:
- Keep the Tuba Tree metaphor but reduce visible reward mechanics.
- Demote bloom/progress language.
- Strengthen journal and witness framing.

Implementation targets:
- `src/screens/ReflectionGarden/ReflectionGardenScreen.tsx`
- `src/components/garden/GardenTeaser.tsx`
- `src/components/garden/ReflectionJournal.tsx`
- `src/components/garden/DawamBadge.tsx`

Exit criteria:
- Reflection remains valuable without reading as gamification.
- Tuba Tree visuals feel symbolic rather than cartoon-reward oriented.
- Reflection becomes more private and less performative.

### Phase 5: Devotion IA

Product intent:
- Dua, adhkar, tasbih, and verse content should remain in the app, but as supporting tools.

Scope:
- Group devotional tools under a clearer secondary information architecture.
- Improve contextual surfacing without giving them equal weight with salah.
- Reduce menu sprawl.

Implementation targets:
- `src/navigation/MenuStackNavigator.tsx`
- `src/screens/Menu/MenuScreen.tsx`
- devotional screen entry points and section copy

Exit criteria:
- Devotional tools are easier to find when needed.
- Prayer remains the dominant product identity.
- The menu stops feeling like a mixed feature marketplace.

### Phase 6: Mosque Mode Flagship

Product intent:
- Sukoon should be uniquely useful for Muslims heading to the masjid.

Scope:
- Elevate Mosque Mode in navigation and home-state transitions.
- Tighten iqamah-aware behavior and messaging.
- Build a stronger Jumu’ah and masjid-arrival experience.

Implementation targets:
- `src/screens/MosqueMode/MosqueModeScreen.tsx`
- mosque mode components and prompt logic
- home-state integrations with mosque flows

Exit criteria:
- Mosque Mode feels like a flagship capability, not a settings-heavy side screen.
- Masjid-going users get a clearly better experience than in generic prayer apps.
