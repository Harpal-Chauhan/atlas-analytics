
import { test, expect } from "@playwright/test";

test("user can sign up, log in and access dashboard", async ({ page }) => {
  const uniqueEmail = `e2e-${Date.now()}@example.com`;
  const password = "AtlasTestPassword123!";

  // Signup
  await page.goto("/signup");

  await page.locator('input[name="company"]').fill("ATLAS E2E Company");
  await page.locator('input[name="name"]').fill("E2E Test User");
  await page.locator('input[name="email"]').fill(uniqueEmail);
  await page.locator('input[name="password"]').fill(password);

  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

  // Login
  await page.locator('input[name="email"]').fill(uniqueEmail);
  await page.locator('input[name="password"]').fill(password);

  await page.getByRole("button", { name: /sign in|log in/i }).click();

  // Dashboard access
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
  await expect(page.locator("body")).not.toContainText(/internal server error/i);
});

test("unauthenticated user cannot access dashboard", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
});
