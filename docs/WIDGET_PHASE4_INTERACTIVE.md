# Phase 4: Interactive Widgets — "Alhamdulillah" Button

Add a reverent, one-tap "mark prayed" interaction to home screen widgets on both iOS and Android, keeping Sukoon's sanctuary philosophy intact.

---

## The Design Tension

Marking a prayer as "prayed" is not a checkbox. In Islam, salah is the most intimate conversation between a servant and their Lord. A quick widget tap risks reducing this to gamification — the exact thing Sukoon's redesign fights against.

**But**: For a Muslim who has *already prayed* and is going about their day, being able to quietly log it without opening the app is a genuine convenience. They've already done the spiritual work. The logging is just bookkeeping.

**Design principle**: The widget button should feel like a *gentle acknowledgment* — like moving a tasbih bead — not like completing a Duolingo lesson. No points, no celebrations, no streak display. Just a quiet state change.

---

## Architecture Overview

### Current Data Flow (one-way: RN → Widget)

```
RN App                          Native Widget
┌─────────────┐    JSON write   ┌──────────────┐
│ WidgetService│───────────────►│ UserDefaults  │ (iOS)
│  .ts         │   + reload     │ SharedPrefs   │ (Android)
│              │                │              │
│ setWidgetData│                │ SukoonWidget │
│ reloadWidgets│                │ (read-only)  │
└─────────────┘                └──────────────┘
```

### Phase 4 Data Flow (bidirectional)

```
RN App                              Native Widget
┌─────────────┐    JSON write       ┌──────────────┐
│ WidgetService│───────────────────►│ UserDefaults  │
│              │                    │ SharedPrefs   │
│              │   pending actions  │              │
│ syncWidget   │◄───────────────────│ "mark prayed" │
│ Actions()    │   (on app open)    │ button tap    │
└─────────────┘                    └──────────────┘
```

The key insight: **widget writes a "pending action" to shared storage, then the RN app reconciles it on next open.** This avoids needing the app to be running.

---

## Existing Precedent in the Codebase

The notification "complete" action in `NavigationProvider.tsx:44-63` already does exactly what we need:
```typescript
// Creates PrayerRecord directly, saves with tracking, reloads widgets
const record: PrayerRecord = {
  id: `prayer_${Date.now()}`,
  date: dateKey,
  prayer: prayer,
  status: 'prayed',
  prayedAt: new Date(),
  mindfulnessCompleted: false,
  reflectionAdded: false,
};
StorageService.savePrayerRecordWithTracking(record);
useStore.getState().addPrayerRecord(record);
WidgetService.reloadWidgets();
```

Phase 4 reuses this exact pattern — the widget tap is morally equivalent to the notification "I prayed" action.

---

## Platform Implementation

### iOS: App Intents (iOS 17+) + widgetURL Fallback (iOS 16)

**iOS 17+ (primary path — no app launch needed):**

1. Define `MarkPrayedIntent: AppIntent` in the widget extension
2. The intent reads the current prayer name from the widget entry
3. On perform:
   - Writes a pending action to App Group UserDefaults (`widgetPendingActions` array)
   - Updates the widget data JSON to flip the prayer's status to `"prayed"` and increment `completedCount`
   - Triggers `WidgetCenter.shared.reloadAllTimelines()`
   - Returns immediately — widget dot fills with sage green, no app launch
4. On next app foreground, `WidgetService.syncWidgetActions()` reads pending actions and creates proper `PrayerRecord` entries

**iOS 16 fallback:**

- Use `.widgetURL(URL(string: "sukoon://mark-prayed/Asr"))` on the checkmark area
- App opens, `NavigationProvider` intercepts the URL, creates record, dismisses

**Widget UI change:**

```
Small widget (2×2):
┌─────────────────────┐
│ ● ● ◯ ◯ ◯          │
│                     │
│      Asr            │
│    3:45 PM          │
│    in 14m           │
│                     │
│ ── Sukoon ── [✓]    │  ← subtle checkmark button, bottom-right
└─────────────────────┘

Medium widget (4×2):
┌──────────────────────────────────────┐
│ NEXT PRAYER · 15 Rajab 1447         │
│                              Faj ●  │
│ Asr              [✓ Prayed]  Dhu ●  │  ← button replaces countdown
│ 3:45 PM · in 14m             Asr ◐  │     when prayer time has entered
│                              Mag ◯  │
│ ────────────────────────            │
│ "In the remembrance..."             │
└──────────────────────────────────────┘
```

The `[✓]` button only appears when `nextPrayer.time <= now` (adhan has happened). Before adhan, the countdown is shown instead. This prevents marking a prayer before its time — a fiqh requirement.

### Android: BroadcastReceiver + PendingIntent

1. Create `WidgetActionReceiver extends BroadcastReceiver`
2. Register it in `AndroidManifest.xml` via the config plugin
3. Small/Medium widget layouts get a clickable checkmark `ImageView`
4. Widget provider sets a `PendingIntent.getBroadcast()` on the checkmark with extras: `{ action: "mark_prayed", prayer_name: "Asr", date: "2026-02-20" }`
5. `WidgetActionReceiver.onReceive()`:
   - Reads `widgetData` from SharedPreferences
   - Appends to `pendingActions` string in SharedPreferences
   - Updates the JSON to flip status → `"prayed"`, increment count
   - Writes back, triggers widget update broadcast
6. On next app open, `WidgetService.syncWidgetActions()` reconciles

---

## RN Sync Layer

### New Bridge Method

Add `getWidgetPendingActions()` to both iOS and Android bridges:

**iOS (Swift):**
```swift
@objc func getWidgetPendingActions(_ resolve: ..., reject: ...) {
    guard let defaults = UserDefaults(suiteName: appGroup) else { ... }
    let actions = defaults.stringArray(forKey: "widgetPendingActions") ?? []
    defaults.removeObject(forKey: "widgetPendingActions")
    defaults.synchronize()
    resolve(actions)  // ["Asr|2026-02-20T15:50:00Z", "Maghrib|2026-02-20T18:15:00Z"]
}
```

**Android (Java):**
```java
@ReactMethod
public void getWidgetPendingActions(Promise promise) {
    SharedPreferences prefs = getReactApplicationContext()
        .getSharedPreferences("sukoon_widget", Context.MODE_PRIVATE);
    String raw = prefs.getString("pendingActions", "");
    prefs.edit().remove("pendingActions").apply();
    promise.resolve(raw);  // "Asr|2026-02-20T15:50:00Z;Maghrib|2026-02-20T18:15:00Z"
}
```

### WidgetService.syncWidgetActions()

```typescript
async syncWidgetActions(): Promise<void> {
  const raw = await SukoonWidgetBridge.getWidgetPendingActions();
  if (!raw || raw.length === 0) return;
  
  // Parse: "PrayerName|ISO_timestamp" entries
  const actions = (Array.isArray(raw) ? raw : raw.split(';'))
    .filter(Boolean)
    .map(entry => {
      const [prayer, timestamp] = entry.split('|');
      return { prayer, timestamp };
    });

  for (const action of actions) {
    const dateKey = getLocalDateKey(new Date(action.timestamp));
    const existing = StorageService.getPrayerRecord(dateKey, action.prayer);
    
    if (!existing || existing.status !== 'prayed') {
      const record: PrayerRecord = {
        id: `widget_${Date.now()}_${action.prayer}`,
        date: dateKey,
        prayer: action.prayer as PrayerName,
        status: 'prayed',
        prayedAt: new Date(action.timestamp),
        mindfulnessCompleted: false,
        reflectionAdded: false,
      };
      StorageService.savePrayerRecordWithTracking(record);
      useStore.getState().addPrayerRecord(record);
    }
  }
}
```

Called from `AppInitializer` or `PrayerTimesProvider` on app foreground (via `AppState` listener).

---

## Visual Design Details

### Checkmark Button Appearance

**Before prayer time enters (countdown shown):**
- No checkmark visible — just the existing countdown

**After adhan (prayer is "current"):**
- Checkmark appears: `☐` outline in `textMuted` color
- Tap target: 44×44pt minimum (iOS HIG)

**After marking prayed:**
- Dot fills sage, checkmark becomes `✓` filled sage
- Text changes from "in Xm" to "Prayed" in sage
- No animation (widget rendering budget is tiny)

**Lock screen widgets:** Read-only. No interactive button. The surfaces are too small and Apple restricts interactivity there.

### Color Palette (reuses existing `SukoonColors`)
- Checkmark outline: `textMuted` (#64748B)
- Checkmark filled: `sage` (#2D8B6F)  
- "Prayed" text: `sage` (#2D8B6F)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `plugins/withWidget.js` | **Modify** | Add `MarkPrayedIntent`, interactive `Button` in widget views, `widgetURL` fallback |
| `plugins/withAndroidWidget.js` | **Modify** | Add `WidgetActionReceiver`, checkmark ImageView + PendingIntent, manifest registration |
| `src/services/WidgetService.ts` | **Modify** | Add `syncWidgetActions()` method |
| `src/components/AppInitializer.tsx` | **Modify** | Call `syncWidgetActions()` on app foreground |

### No new RN screens needed
Unlike the original plan's "QuickMarkSheet" idea, we don't need a confirmation screen. The precedent is already set: notification "complete" action marks prayer instantly without confirmation. The widget button should behave identically — a single tap marks it, full stop. If the user made a mistake, they can undo it from the prayer card in the app (same as notification-marked prayers).

---

## Implementation Steps

### Step 1: iOS App Intent + Widget UI
1. Add `MarkPrayedIntent` struct to `WIDGET_SWIFT` (gated behind `@available(iOS 17.0, *)`)
2. Add `getWidgetPendingActions` to `BRIDGE_SWIFT` + `BRIDGE_OBJC`
3. Update `SmallWidgetView` — add checkmark button (conditionally shown when prayer time has entered)
4. Update `MediumWidgetView` — add "✓ Prayed" / checkmark button
5. For iOS 16: add `.widgetURL` fallback on the checkmark area

### Step 2: Android BroadcastReceiver + Widget UI
1. Create `WIDGET_ACTION_RECEIVER_JAVA` constant
2. Add `getWidgetPendingActions` to `BRIDGE_JAVA`
3. Update `LAYOUT_SMALL` — add checkmark `ImageView` with tap target
4. Update `LAYOUT_MEDIUM` — add checkmark area
5. Update `SMALL_WIDGET_JAVA` / `MEDIUM_WIDGET_JAVA` — set PendingIntent on checkmark
6. Register receiver in `AndroidManifest.xml` via config plugin

### Step 3: RN Sync Layer
1. Add `syncWidgetActions()` to `WidgetService.ts`
2. Add `getWidgetPendingActions` to bridge type declarations
3. Hook into `AppInitializer.tsx` with `AppState` foreground listener

### Step 4: Edge Cases & Safety
- **Double-marking guard**: Both native receivers and RN sync check for existing `prayed` status before writing
- **Date boundary**: Use the timestamp from the pending action, not `Date.now()`, to handle midnight edge cases
- **Stale data**: If widget data is >24h old, disable the checkmark (show "Open app to update")
- **Fiqh guard**: Only show checkmark after adhan time — cannot mark a future prayer

### Step 5: Prebuild + Test
- `npx expo prebuild --clean`
- Test iOS 17 simulator: tap checkmark → dot fills → open app → record synced
- Test Android emulator: tap checkmark → dot fills → open app → record synced
- Test iOS 16 path: tap checkmark → app opens → record created

---

## What This Does NOT Include (By Design)

- **No gamification**: No streak display on widget, no celebration animation, no points
- **No MindfulnessFlow shortcut**: The widget marks "prayed" (simple bookkeeping), it does NOT offer the breathing/dhikr/reflection journey — that remains app-exclusive
- **No lock screen interaction**: Lock screen widgets stay read-only
- **No undo on widget**: Undo happens in the app via prayer card
- **No "missed" marking**: Widget only offers "I prayed" — missed status is derived automatically by the app's existing logic

---

## Estimated Effort

| Step | Effort |
|------|--------|
| iOS App Intent + UI | ~2 hours |
| Android Receiver + UI | ~2 hours |
| RN sync layer | ~30 min |
| Edge cases + testing | ~1 hour |
| **Total** | **~5.5 hours** |
