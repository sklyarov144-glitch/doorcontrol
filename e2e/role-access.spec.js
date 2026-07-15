import { expect, test } from "@playwright/test";

const password = "123456";

async function login(page, email) {
  await page.goto("/login");
  await page.getByLabel("Демо-пользователь").selectOption(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
}

for (const account of [
  { email: "creator@example.test", role: "creator" },
  { email: "head@example.test", role: "company_head" },
  { email: "director@example.test", role: "construction_director" },
]) {
  test(`${account.role} имеет доступ к админ-панели`, async ({ page }) => {
    await login(page, account.email);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("button", { name: "Админ-панель", exact: true })).toBeVisible();

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Админ-панель", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Настройка объекта", exact: true })).toBeVisible();
  });
}

test("ИТР не видит и не может открыть админ-панель", async ({ page }) => {
  await login(page, "itr@example.test");

  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByRole("button", { name: "Админ-панель", exact: true })).toHaveCount(0);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByRole("heading", { name: "Задачи", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Админ-панель", exact: true })).toHaveCount(0);
});
