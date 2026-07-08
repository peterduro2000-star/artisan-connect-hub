export function getTelHref(phone?: string | null) {
  const cleaned = phone?.trim();
  return cleaned ? `tel:${cleaned.replace(/\s+/g, "")}` : undefined;
}

export function getWhatsAppHref(phone?: string | null) {
  const cleaned = phone?.replace(/[^\d+]/g, "");
  if (!cleaned) return undefined;

  const international = cleaned.startsWith("+")
    ? cleaned.slice(1)
    : cleaned.startsWith("234")
      ? cleaned
      : cleaned.startsWith("0")
        ? `234${cleaned.slice(1)}`
        : `234${cleaned}`;

  return `https://wa.me/${international}`;
}

/**
 * Masks a phone number to prevent harvesting
 * Shows first 3 and last 2 digits, masks the middle
 * Example: "08030000000" -> "080****0000"
 */
export function maskPhoneNumber(phone?: string | null) {
  if (!phone) return "N/A";
  
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 5) return phone; // Too short to mask meaningfully
  
  const first = cleaned.slice(0, 3);
  const last = cleaned.slice(-2);
  const masked = "****";
  
  return `${first}${masked}${last}`;
}
