import { expect, test } from "@playwright/test";

test("ИТР проходит от входа до двери и сохраняет рабочий статус", async ({ page }) => {
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  await page.goto("/login");

  await page.getByLabel("Демо-пользователь").selectOption("itr@example.test");
  await page.getByLabel("Пароль").fill("123456");
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page).toHaveURL(/\/tasks$/);
  await page.getByRole("button", { name: "Мои объекты", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Мои объекты", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Открыть объект ЖК Матвеевский парк" }).click();
  await expect(page.getByRole("heading", { name: "Корпуса объекта" })).toBeVisible();

  await page.getByRole("button", { name: "Открыть корпус Корпус 4.1" }).click();
  await expect(page.getByRole("heading", { name: "Визуализация корпуса" })).toBeVisible();

  await page.getByRole("button", { name: "Открыть 15 этаж", exact: true }).click();
  await expect(page.getByRole("heading", { name: "План этажа", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Д-1", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Карточка двери" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Квартира 1" })).toBeVisible();

  await page.getByLabel("Статус двери").selectOption("доставлена");
  await page.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(page.getByText("Изменения сохранены", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Статус двери")).toHaveValue("доставлена");
  await page.getByRole("button", { name: "Назад к плану" }).click();
  await expect(page.locator("button.door-marker.status-blue", { hasText: "Д-1" })).toBeVisible();

  expect(runtimeErrors).toEqual([]);
});
