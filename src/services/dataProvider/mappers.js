const camelToSnake = (key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const snakeToCamel = (key) => key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

function mapObject(value, keyMapper) {
  if (Array.isArray(value)) return value.map((item) => mapObject(item, keyMapper));
  if (!value || typeof value !== "object" || value instanceof Date) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      keyMapper(key),
      mapObject(nestedValue, keyMapper),
    ])
  );
}

export const toDatabase = (value) => mapObject(value, camelToSnake);
export const fromDatabase = (value) => mapObject(value, snakeToCamel);

