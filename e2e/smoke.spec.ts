import { test, expect } from '@playwright/test';

test.describe('Positron Smoke Tests', () => {
  test('Health Check ist erreichbar', async ({ page }) => {
    const res = await page.request.get('http://localhost:3000/api/health');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('status');
    expect(json.status).toBe('ok');
  });

  test('Dashboard lädt und zeigt Runs an', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Positron/);
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
  });

  test('API-Runs-Endpoint antwortet', async ({ page }) => {
    const res = await page.request.get('http://localhost:3000/api/runs');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('runs');
    expect(Array.isArray(json.runs)).toBe(true);
  });
});
