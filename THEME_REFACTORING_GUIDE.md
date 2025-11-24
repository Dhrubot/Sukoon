# Theme Refactoring Guide

This guide shows how to refactor components to use the centralized theme system.

## Quick Start

### 1. Import the theme hook
```typescript
import { useTheme } from '../providers/ThemeProvider';
// or for helper hook
import { useThemedStyles } from '../hooks/useThemedStyles';
```

### 2. Access theme in your component
```typescript
const { theme, themeMode, toggleTheme } = useTheme();
```

## Refactoring Patterns

### Pattern 1: Simple Component with Inline Styles

**Before:**
```typescript
const MyComponent = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1F3A',
    padding: 20,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
```

**After:**
```typescript
const MyComponent = () => {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <Text style={[styles.text, { color: theme.colors.text.primary }]}>Hello</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  text: {
    fontSize: 16,
  },
});
```

### Pattern 2: Using useThemedStyles Hook (Recommended)

**Before:**
```typescript
const MyComponent = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Title</Text>
      <Text style={styles.subtitle}>Subtitle</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#252B47',
    padding: 20,
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#A0AEC0',
  },
});
```

**After:**
```typescript
import { useThemedStyles } from '../hooks/useThemedStyles';

const MyComponent = () => {
  const styles = useThemedStyles(createStyles);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Title</Text>
      <Text style={styles.subtitle}>Subtitle</Text>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card.background,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
  },
});
```

### Pattern 3: Cards and Interactive Elements

**Before:**
```typescript
<TouchableOpacity style={styles.card}>
  <Text style={styles.cardTitle}>Card Title</Text>
  <View style={styles.badge}>
    <Text style={styles.badgeText}>New</Text>
  </View>
</TouchableOpacity>

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#252B47',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2D3454',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: '#00C9A7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
```

**After:**
```typescript
const { theme } = useTheme();

<TouchableOpacity style={[styles.card, {
  backgroundColor: theme.colors.card.background,
  borderColor: theme.colors.border.primary,
}]}>
  <Text style={[styles.cardTitle, { color: theme.colors.text.primary }]}>
    Card Title
  </Text>
  <View style={[styles.badge, { backgroundColor: theme.colors.primary.DEFAULT }]}>
    <Text style={[styles.badgeText, { color: theme.colors.primary.contrast }]}>
      New
    </Text>
  </View>
</TouchableOpacity>

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
```

### Pattern 4: Screen with Multiple Components

**Before:**
```typescript
const MyScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Screen</Text>
      </View>
      <ScrollView style={styles.content}>
        {/* Content */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1F3A',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#252B47',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
});
```

**After (Option 1 - Inline):**
```typescript
const MyScreen = () => {
  const { theme } = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border.secondary }]}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>My Screen</Text>
      </View>
      <ScrollView style={styles.content}>
        {/* Content */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
});
```

**After (Option 2 - useThemedStyles):**
```typescript
const MyScreen = () => {
  const styles = useThemedStyles(createStyles);
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Screen</Text>
      </View>
      <ScrollView style={styles.content}>
        {/* Content */}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    padding: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.secondary,
  },
  title: {
    fontSize: theme.typography.fontSize.xxxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  content: {
    flex: 1,
  },
});
```

## Theme Color Reference

### Backgrounds
- `theme.colors.background.primary` - Main background (#1A1F3A dark, #FFFFFF light)
- `theme.colors.background.secondary` - Secondary background (#252B47 dark, #F5F5F5 light)
- `theme.colors.background.tertiary` - Tertiary background (#2D3454 dark, #E0E0E0 light)

### Text
- `theme.colors.text.primary` - Primary text (#FFFFFF dark, #212121 light)
- `theme.colors.text.secondary` - Secondary text (#A0AEC0 dark, #757575 light)
- `theme.colors.text.muted` - Muted text (#6C7A89 dark, #9E9E9E light)

### Primary (Turquoise)
- `theme.colors.primary.DEFAULT` - Primary color (#00C9A7 dark, #00A589 light)
- `theme.colors.primary.light` - Light variant
- `theme.colors.primary.dark` - Dark variant
- `theme.colors.primary.contrast` - Contrast text color

### Cards & Borders
- `theme.colors.card.background` - Card background
- `theme.colors.card.hover` - Card hover state
- `theme.colors.border.primary` - Primary border color
- `theme.colors.border.focus` - Focus/active border

### Status Colors
- `theme.colors.status.success` - Success state
- `theme.colors.status.error` - Error state
- `theme.colors.status.warning` - Warning state
- `theme.colors.status.info` - Info state

## Spacing Reference
```typescript
theme.spacing.xs    // 4
theme.spacing.sm    // 8
theme.spacing.md    // 12
theme.spacing.lg    // 16
theme.spacing.xl    // 20
theme.spacing.xxl   // 24
theme.spacing.xxxl  // 32
```

## Typography Reference
```typescript
theme.typography.fontSize.xs      // 12
theme.typography.fontSize.sm      // 14
theme.typography.fontSize.base    // 16
theme.typography.fontSize.lg      // 18
theme.typography.fontSize.xl      // 20
theme.typography.fontSize.xxl     // 24
theme.typography.fontSize.xxxl    // 28
theme.typography.fontSize.xxxxl   // 32

theme.typography.fontWeight.normal    // '400'
theme.typography.fontWeight.medium    // '500'
theme.typography.fontWeight.semibold  // '600'
theme.typography.fontWeight.bold      // '700'
```

## Adding Theme Toggle to Settings

```typescript
import { useTheme } from '../providers/ThemeProvider';

const SettingsScreen = () => {
  const { theme, themeMode, toggleTheme, setThemeMode } = useTheme();
  
  return (
    <View>
      <Text>Current theme: {themeMode}</Text>
      <TouchableOpacity onPress={toggleTheme}>
        <Text>Toggle Theme</Text>
      </TouchableOpacity>
      {/* Or use a picker */}
      <Picker
        selectedValue={themeMode}
        onValueChange={(value) => setThemeMode(value)}
      >
        <Picker.Item label="Dark" value="dark" />
        <Picker.Item label="Light" value="light" />
      </Picker>
    </View>
  );
};
```

## Migration Checklist

- [ ] Identify all hardcoded colors in component
- [ ] Replace hardcoded colors with theme colors
- [ ] Use spacing values from theme instead of magic numbers
- [ ] Use typography values from theme
- [ ] Test component in both dark and light modes
- [ ] Update StyleSheet to remove color properties or use inline styles
- [ ] Consider using `useThemedStyles` for cleaner code

## Best Practices

1. **Prefer useThemedStyles for complex components** - It keeps your code cleaner and more maintainable
2. **Use inline styles for simple color changes** - For just 1-2 color properties, inline styles are fine
3. **Leverage theme spacing and typography** - Don't use magic numbers
4. **Test in both themes** - Always verify your component works in both dark and light modes
5. **Use semantic color names** - Use `theme.colors.text.primary` instead of directly accessing hex values
6. **Keep consistent patterns** - Choose one pattern per component type and stick with it

## Common Gotchas

- Don't forget to add `backgroundColor` to containers that need it
- Remember `ActivityIndicator` needs a `color` prop
- StatusBar should match the theme (handled by ThemeProvider)
- Modal overlays should use `theme.colors.background.overlay`
- Interactive elements should use `theme.colors.interactive.active/hover/disabled`
