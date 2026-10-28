/** Normalizes a US phone number to E.164 (+15551234567). Returns null when it doesn't look valid. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (input.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

/** +15551234567 -> (555) 123-4567 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const m = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : phone;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
