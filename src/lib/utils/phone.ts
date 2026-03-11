/**
 * Formats a phone number to always include the Senegal country code (+221).
 * If the number is 9 digits and doesn't start with +, it adds +221.
 * If it already has a +, it returns it as is.
 */
export function formatSenegalPhone(phone: string | null): string | null {
  if (!phone) return null;
  
  // Clean all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it's already in international format (starts with +)
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If it's 9 digits (Senegal standard: 77, 78, 76, 70 etc + 7 digits)
  if (cleaned.length === 9) {
    return `+221${cleaned}`;
  }
  
  // Fallback: if it's longer but might be missing the +, we can try to guess or just return
  // For safety, only auto-prefix 9-digit local numbers
  return cleaned;
}
