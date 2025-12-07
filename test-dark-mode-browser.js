/**
 * Browser Console Test for Dark Mode
 * 
 * Run these commands in your browser console to verify dark mode behavior:
 */

// Test 1: Clear localStorage and reload - should default to LIGHT mode
console.log('Test 1: Clear storage and check default');
localStorage.removeItem('theme');
console.log('Cleared theme from localStorage');
console.log('Reload the page - should show LIGHT mode (not browser preference)');
console.log('---');

// Test 2: Set to dark mode programmatically
console.log('Test 2: Set dark mode');
localStorage.setItem('theme', 'dark');
document.documentElement.classList.add('dark');
console.log('Set dark mode. Page should now be DARK');
console.log('Reload the page - should stay DARK');
console.log('---');

// Test 3: Set to light mode programmatically  
console.log('Test 3: Set light mode');
localStorage.setItem('theme', 'light');
document.documentElement.classList.remove('dark');
console.log('Set light mode. Page should now be LIGHT');
console.log('Reload the page - should stay LIGHT');
console.log('---');

// Test 4: Check current state
console.log('Test 4: Check current state');
console.log('localStorage theme:', localStorage.getItem('theme'));
console.log('Has dark class:', document.documentElement.classList.contains('dark'));
console.log('Browser preference (should be IGNORED):', 
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
);
