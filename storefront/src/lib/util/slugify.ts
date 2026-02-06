export const slugify = (value: unknown) => {
  const normalized =
    Array.isArray(value) ? value.filter(Boolean).join(" ") : value ?? ""
  return String(normalized)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
