import { expect, test } from "@playwright/test";

const password = "123456";

async function login(page, email) {
  await page.goto("/login");
  await page.getByLabel("Демо-пользователь").selectOption(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("создатель открывает tenant компании и фактическую матрицу ролей", async ({ page }) => {
  await login(page, "creator@example.test");

  await page.getByRole("button", { name: "Компания", exact: true }).click();
  await expect(page).toHaveURL(/\/companies$/);
  await expect(page.getByRole("heading", { name: "ГРОСС", exact: true })).toBeVisible();
  await expect(page.getByText("Контур компании", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Роли", exact: true }).click();
  await expect(page).toHaveURL(/\/roles$/);
  await expect(page.getByRole("heading", { name: "Матрица полномочий", exact: true })).toBeVisible();
});

test("руководитель компании открывает финансовый контур без creator-разделов", async ({ page }) => {
  await login(page, "head@example.test");

  await page.getByRole("button", { name: "Финансы", exact: true }).click();
  await expect(page).toHaveURL(/\/finance$/);
  await expect(page.getByRole("heading", { name: "Финансовый контур", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Добавить", exact: true })).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Компания", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Роли", exact: true })).toHaveCount(0);
});

test("директор открывает назначенный объект и корпус с управленческими действиями", async ({ page }) => {
  await login(page, "director@example.test");

  await page.getByRole("button", { name: "Мои объекты", exact: true }).click();
  await expect(page).toHaveURL(/\/objects$/);
  await page.getByRole("button", { name: "Открыть объект ЖК Матвеевский парк", exact: true }).click();
  await expect(page).toHaveURL(/\/objects\/matveevsky-park$/);
  await expect(page.getByRole("button", { name: "Редактировать объект", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Добавить корпус", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Поставить задачу", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Открыть корпус Корпус 4.1", exact: true }).click();
  await expect(page).toHaveURL(/\/objects\/matveevsky-park\/buildings\/matveevsky-park-building-4-1$/);
  await expect(page.getByRole("heading", { name: "Визуализация корпуса", exact: true })).toBeVisible();
});
