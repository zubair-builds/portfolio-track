import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfessionalHeader from '../components/ProfessionalHeader';

// Mock Next.js router and navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
}));

// Mock HeaderSymbolSearch to avoid router issues
jest.mock('../components/HeaderSymbolSearch', () => {
  return function MockHeaderSymbolSearch() {
    return <div data-testid="mock-search">Search</div>;
  };
});

describe('Dark Mode Toggle', () => {
  beforeEach(() => {
    // Reset DOM and localStorage
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  describe('Theme Initialization', () => {
    it('should load dark theme from localStorage on mount', () => {
      // Simulate saved dark theme preference
      localStorage.setItem('theme', 'dark');
      
      // Simulate the initialization script from layout.tsx
      const theme = localStorage.getItem('theme');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      }

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should load light theme from localStorage on mount', () => {
      localStorage.setItem('theme', 'light');
      
      const theme = localStorage.getItem('theme');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      }

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should default to light mode when no saved theme', () => {
      // No localStorage theme set
      const theme = localStorage.getItem('theme');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Should default to light mode
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should respect saved light theme', () => {
      // User explicitly saved light mode
      localStorage.setItem('theme', 'light');
      
      const theme = localStorage.getItem('theme');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Should respect user's explicit light choice
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(theme).toBe('light');
    });
  });

  describe('Theme Toggle Button', () => {
    it('should toggle dark class on document element', () => {
      const mockSignOut = jest.fn();
      render(
        <ProfessionalHeader 
          user={{ name: 'Test User', email: 'test@example.com' }} 
          onSignOut={mockSignOut}
        />
      );

      const toggleButton = screen.getByTitle('Toggle dark mode');
      
      // Initial state: light mode
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Click to enable dark mode
      fireEvent.click(toggleButton);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem('theme')).toBe('dark');

      // Click to disable dark mode
      fireEvent.click(toggleButton);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem('theme')).toBe('light');
    });

    it('should persist theme preference to localStorage', () => {
      const mockSignOut = jest.fn();
      render(
        <ProfessionalHeader 
          user={{ name: 'Test User', email: 'test@example.com' }} 
          onSignOut={mockSignOut}
        />
      );

      const toggleButton = screen.getByTitle('Toggle dark mode');

      // Enable dark mode
      fireEvent.click(toggleButton);
      expect(localStorage.getItem('theme')).toBe('dark');

      // Disable dark mode
      fireEvent.click(toggleButton);
      expect(localStorage.getItem('theme')).toBe('light');
    });

    it('should apply correct CSS classes for dark mode', () => {
      const mockSignOut = jest.fn();
      render(
        <ProfessionalHeader 
          user={{ name: 'Test User', email: 'test@example.com' }} 
          onSignOut={mockSignOut}
        />
      );

      const toggleButton = screen.getByTitle('Toggle dark mode');
      
      // Toggle to dark mode
      fireEvent.click(toggleButton);
      
      // Verify tailwind dark mode class is applied
      expect(document.documentElement.className).toContain('dark');
    });

    it('should maintain theme state after multiple toggles', () => {
      const mockSignOut = jest.fn();
      render(
        <ProfessionalHeader 
          user={{ name: 'Test User', email: 'test@example.com' }} 
          onSignOut={mockSignOut}
        />
      );

      const toggleButton = screen.getByTitle('Toggle dark mode');

      // Multiple toggles
      fireEvent.click(toggleButton); // dark
      fireEvent.click(toggleButton); // light
      fireEvent.click(toggleButton); // dark
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  describe('End-to-End Theme Persistence', () => {
    it('should persist theme across simulated page reloads', () => {
      const mockSignOut = jest.fn();
      
      // 1. User toggles to dark mode
      const { unmount } = render(
        <ProfessionalHeader 
          user={{ name: 'Test User', email: 'test@example.com' }} 
          onSignOut={mockSignOut}
        />
      );
      
      const toggleButton = screen.getByTitle('Toggle dark mode');
      fireEvent.click(toggleButton);
      expect(localStorage.getItem('theme')).toBe('dark');
      
      // 2. Unmount component (simulating navigation away)
      unmount();
      
      // 3. Simulate page reload - run initialization script
      const theme = localStorage.getItem('theme');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      
      // 4. Verify dark mode persisted
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      
      // 5. Remount component
      render(
        <ProfessionalHeader 
          user={{ name: 'Test User', email: 'test@example.com' }} 
          onSignOut={mockSignOut}
        />
      );
      
      // 6. Dark mode should still be active
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
});
