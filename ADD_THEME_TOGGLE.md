# Adding Theme Toggle to Settings

## Quick Implementation Guide

### Option 1: Simple Toggle (Recommended)

Add this to `SettingsScreen.tsx` in the appropriate section:

```typescript
import { useTheme } from '../../providers/ThemeProvider';

// Inside SettingsScreen component
const { themeMode, toggleTheme } = useTheme();

// Add this SettingRow to your UI section (e.g., in appearance or general settings)
<SettingRow
  label="Theme"
  value={themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
  onPress={toggleTheme}
/>
```

### Option 2: Picker/Selector

For more control with a modal picker:

```typescript
import { useTheme } from '../../providers/ThemeProvider';
import { useState } from 'react';

const SettingsScreen = () => {
  const { theme, themeMode, setThemeMode } = useTheme();
  const [showThemePicker, setShowThemePicker] = useState(false);

  return (
    <>
      <SettingRow
        label="Theme"
        value={themeMode === 'dark' ? 'Dark' : 'Light'}
        onPress={() => setShowThemePicker(true)}
      />

      {/* Add Theme Picker Modal */}
      <Modal
        visible={showThemePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowThemePicker(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card.background }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
              Choose Theme
            </Text>
            
            <TouchableOpacity
              style={[styles.themeOption, themeMode === 'dark' && styles.selectedOption]}
              onPress={() => {
                setThemeMode('dark');
                setShowThemePicker(false);
              }}
            >
              <Text style={{ color: theme.colors.text.primary }}>🌙 Dark Mode</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.themeOption, themeMode === 'light' && styles.selectedOption]}
              onPress={() => {
                setThemeMode('light');
                setShowThemePicker(false);
              }}
            >
              <Text style={{ color: theme.colors.text.primary }}>☀️ Light Mode</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowThemePicker(false)}
            >
              <Text style={{ color: theme.colors.text.secondary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

// Add these styles to your StyleSheet
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  themeOption: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: 'rgba(0, 201, 167, 0.2)',
    borderWidth: 2,
    borderColor: '#00C9A7',
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
});
```

### Option 3: Switch Toggle

For an inline switch:

```typescript
import { useTheme } from '../../providers/ThemeProvider';

const SettingsScreen = () => {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>Dark Mode</Text>
      <Switch
        value={themeMode === 'dark'}
        onValueChange={(value) => setThemeMode(value ? 'dark' : 'light')}
        trackColor={{ 
          false: '#767577', 
          true: '#00C9A7' 
        }}
        thumbColor={themeMode === 'dark' ? '#FFFFFF' : '#f4f3f4'}
      />
    </View>
  );
};
```

## Where to Add It

### Recommended Section: Appearance/Display

Create a new section or add to existing one:

```typescript
<SettingSection title="APPEARANCE">
  <SettingRow
    label="Theme"
    subtext="Switch between dark and light mode"
    value={themeMode === 'dark' ? 'Dark' : 'Light'}
    onPress={toggleTheme}
  />
  
  {/* Other appearance settings */}
</SettingSection>
```

### Alternative: General Settings

```typescript
<SettingSection title="GENERAL">
  <SettingRow
    label="Notifications"
    value="Enabled"
    onPress={handleNotifications}
  />
  
  <SettingRow
    label="Theme"
    value={themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
    onPress={toggleTheme}
  />
  
  {/* Other general settings */}
</SettingSection>
```

## Testing

After implementing:

1. **Add the toggle** to Settings
2. **Tap to switch** from dark to light mode
3. **Check all screens**:
   - Home screen
   - Prayer cards
   - Stats
   - Settings
   - Navigation

4. **Verify persistence**:
   - Change theme
   - Close app
   - Reopen app
   - Theme should be preserved

## What Happens When You Toggle

✅ **Colors update instantly** across all refactored components  
✅ **Status bar adjusts** automatically  
✅ **Preference is saved** to storage  
✅ **Smooth transition** with no lag

## Current Theme Support Status

### ✅ Fully Themed (Will switch instantly)
- Home Screen
- Prayer Cards
- Navigation
- Settings
- LoadingScreen
- QuickStats
- DailyVerse
- DigitalWellnessCard

### ⏳ Not Yet Themed (Will stay dark)
- Stats Screen
- Achievements Screen
- Support Screen
- Some modals

These can be refactored later using the same patterns.

## Example: Complete Implementation

Here's a complete example to copy-paste into SettingsScreen:

```typescript
// Add at top of file
import { useTheme } from '../../providers/ThemeProvider';

// Inside SettingsScreen component, get theme:
const { theme, themeMode, toggleTheme } = useTheme();

// Add this section to your render (after other sections):
<SettingSection title="APPEARANCE">
  <SettingRow
    label="App Theme"
    subtext="Choose your preferred color scheme"
    value={themeMode === 'dark' ? '🌙 Dark' : '☀️ Light'}
    onPress={toggleTheme}
  />
</SettingSection>
```

That's it! Your theme toggle is ready. 🎉
