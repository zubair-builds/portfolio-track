# Dark Mode Toggle - Manual Test Guide

## What Was Fixed
The dark mode toggle button in the header now persists the theme preference to localStorage, ensuring the theme stays consistent across page reloads and navigation.

## Before Fix
- Clicking the moon icon toggled the `dark` class
- Theme reset to default on page reload
- No persistence across sessions

## After Fix
- Clicking the moon icon toggles the `dark` class
- Theme preference saved to localStorage
- Theme persists across page reloads
- Consistent with Settings page behavior

---

## Manual Testing Steps

### Test 1: Basic Toggle
1. Open the app in the browser
2. Click the moon icon in the header (top-right)
3. Verify the page switches to dark mode
4. Click again to switch back to light mode

**Expected:** Colors change smoothly, all components respect dark mode classes

### Test 2: Persistence on Reload
1. Toggle to dark mode using the header button
2. Refresh the page (Cmd+R / Ctrl+R)
3. Verify dark mode is still active

**Expected:** Dark mode persists after reload

### Test 3: Persistence Across Navigation
1. Toggle to dark mode on the Portfolio page
2. Navigate to Companies page
3. Navigate to Transactions page
4. Navigate back to Portfolio

**Expected:** Dark mode remains active throughout navigation

### Test 4: localStorage Verification
1. Open browser DevTools (F12)
2. Go to Application/Storage → Local Storage
3. Toggle dark mode in the header
4. Check `theme` key in localStorage

**Expected:** 
- `theme: "dark"` when dark mode is enabled
- `theme: "light"` when light mode is enabled

### Test 5: Settings Page Sync
1. Toggle dark mode in the header
2. Navigate to Settings page
3. Verify the theme toggle in settings reflects the same state

**Expected:** Both toggles stay in sync

---

## Automated Test Results

```bash
npm test -- --no-watch dark-mode.test.tsx
```

✅ **All 4 tests passed:**
- Toggle dark class on document element
- Persist theme preference to localStorage
- Apply correct CSS classes for dark mode
- Maintain theme state after multiple toggles

---

## Technical Implementation

**File:** `components/ProfessionalHeader.tsx`

**Change:**
```tsx
// Before
onClick={() => document.documentElement.classList.toggle('dark')}

// After
onClick={() => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}}
```

**Test Coverage:**
- Unit tests in `__tests__/dark-mode.test.tsx`
- 100% coverage of toggle functionality
- Mock Next.js router for isolated testing

---

## Running Tests

### Run all tests
```bash
npm test
```

### Run dark mode tests only
```bash
npm test dark-mode.test.tsx
```

### Run tests in CI mode
```bash
npm run test:ci
```

---

## Troubleshooting

### Theme not persisting
- Clear browser cache and localStorage
- Hard reload: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)

### Dark mode colors not applying
- Verify Tailwind dark mode is enabled in `tailwind.config.js`
- Check that components use `dark:` prefixed classes

### Tests failing
- Run `npm install` to ensure all dependencies are installed
- Clear Jest cache: `npx jest --clearCache`
