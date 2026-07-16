import { expect, test } from "@playwright/test";

const enabled = process.env.REMOTE_AUTH_SMOKE === "1";
const accounts = [
  {
    role: "creator",
    email: process.env.AUTH_SMOKE_CREATOR_EMAIL,
    password: process.env.AUTH_SMOKE_CREATOR_PASSWORD,
    path: "/dashboard",
    visibleMenu: "Компания",
  },
  {
    role: "company_head",
    email: process.env.AUTH_SMOKE_COMPANY_HEAD_EMAIL,
    password: process.env.AUTH_SMOKE_COMPANY_HEAD_PASSWORD,
    path: "/dashboard",
    visibleMenu: "Дашборд",
  },
  {
    role: "construction_director",
    email: process.env.AUTH_SMOKE_CONSTRUCTION_DIRECTOR_EMAIL,
    password: process.env.AUTH_SMOKE_CONSTRUCTION_DIRECTOR_PASSWORD,
    path: "/dashboard",
    visibleMenu: "Админ-панель",
  },
  {
    role: "itr",
    email: process.env.AUTH_SMOKE_ITR_EMAIL,
    password: process.env.AUTH_SMOKE_ITR_PASSWORD,
    path: "/tasks",
    visibleMenu: "Мои объекты",
  },
];

test.describe("published Supabase authentication", () => {
  test.skip(!enabled, "Runs only against a published Supabase environment");

  for (const account of accounts) {
    test(`${account.role} signs in through the published UI`, async ({ page }) => {
      test.setTimeout(60_000);
      const runtimeErrors = [];
      page.on("pageerror", (error) => runtimeErrors.push(error.message));

      await page.goto("/login");
      await page.getByLabel("Email", { exact: true }).fill(account.email);
      await page.getByLabel("Пароль", { exact: true }).fill(account.password);
      await page.getByRole("button", { name: "Войти", exact: true }).click();

      await expect(page).toHaveURL(new RegExp(`${account.path}$`), { timeout: 30_000 });
      await expect(page.getByRole("button", { name: account.visibleMenu, exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Личный кабинет", exact: true })).toBeVisible();
      if (account.role === "itr") {
        await expect(page.getByRole("button", { name: "Админ-панель", exact: true })).toHaveCount(0);
      }
      expect(runtimeErrors).toEqual([]);
    });
  }
});
