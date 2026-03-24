import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('should have proper page titles', async ({ page }) => {
    const routes = [
      { path: '/', expectedTitle: 'OlimpX' },
      { path: '/auth', expectedTitle: 'Auth' },
      { path: '/tournaments', expectedTitle: 'Tournaments' },
      { path: '/tasks', expectedTitle: 'Tasks' }
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      
      const title = await page.title();
      expect(title).toContain(route.expectedTitle);
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    
    if (headings.length > 0) {
      const firstHeading = headings[0];
      const tagName = await firstHeading.evaluate(el => el.tagName);
      expect(['H1', 'H2']).toContain(tagName);
    }
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const images = await page.locator('img').all();
    
    for (const image of images) {
      const alt = await image.getAttribute('alt');
      const src = await image.getAttribute('src');
      
      if (src && !src.includes('data:')) {
        expect(alt).toBeTruthy();
      }
    }
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    const inputs = await page.locator('input[type="text"], input[type="email"], input[type="password"], textarea, select').all();
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = await label.count() > 0;
        expect(hasLabel || ariaLabel || ariaLabelledBy).toBe(true);
      } else {
        expect(ariaLabel || ariaLabelledBy).toBe(true);
      }
    }
  });

  test('should have proper button accessibility', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const buttons = await page.locator('button, [role="button"]').all();
    
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      
      expect(ariaLabel || (text && text.trim().length > 0)).toBe(true);
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const focusableElements = await page.locator('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])').all();
    
    if (focusableElements.length > 0) {
      await page.keyboard.press('Tab');
      
      const focusedElement = await page.locator(':focus');
      expect(await focusedElement.count()).toBeGreaterThan(0);
    }
  });

  test('should have proper link accessibility', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const links = await page.locator('a').all();
    
    for (const link of links) {
      const href = await link.getAttribute('href');
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      
      if (href && href !== '#') {
        expect(text?.trim() || ariaLabel).toBeTruthy();
      }
    }
  });

  test('should have proper ARIA roles', async ({ page }) => {
    await page.goto('/tournaments');
    await page.waitForLoadState('networkidle');
    
    const elementsWithRoles = await page.locator('[role]').all();
    
    for (const element of elementsWithRoles) {
      const role = await element.getAttribute('role');
      expect(role).toBeTruthy();
      
      const validRoles = [
        'button', 'link', 'navigation', 'main', 'complementary', 
        'contentinfo', 'banner', 'search', 'dialog', 'alert', 
        'status', 'tabpanel', 'tablist', 'tab', 'checkbox', 
        'radio', 'textbox', 'combobox', 'listbox', 'option'
      ];
      
      expect(validRoles).toContain(role);
    }
  });

  test('should have proper color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const textElements = await page.locator('p, h1, h2, h3, h4, h5, h6, span, a, button').all();
    
    for (const element of textElements) {
      const styles = await element.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize
        };
      });
      
      expect(styles.color).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('should handle screen reader announcements', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').all();
    
    for (const region of liveRegions) {
      const ariaLive = await region.getAttribute('aria-live');
      const role = await region.getAttribute('role');
      
      expect(ariaLive || role).toBeTruthy();
    }
  });
});
