export function getTelHref(phone?: string | null) {
  const cleaned = phone?.trim();
  return cleaned ? `tel:${cleaned.replace(/\s+/g, "")}` : undefined;
}

export function getWhatsAppHref(phone?: string | null) {
  const cleaned = phone?.replace(/[^\d+]/g, "");
  if (!cleaned) return undefined;

  const international = cleaned.startsWith("+")
    ? cleaned.slice(1)
    : cleaned.startsWith("0")
      ? `234${cleaned.slice(1)}`
      : cleaned;

  return `https://wa.me/${international}`;
}
