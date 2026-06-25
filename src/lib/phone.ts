/**
 * Formats a phone number as (XXX) XXX-XXXX as the user types.
 * Port of AddClientView.formatPhoneNumber.
 */
export function formatPhoneNumber(input: string): string {
  const limited = input.replace(/\D/g, '').slice(0, 10);
  let result = '';
  for (let i = 0; i < limited.length; i++) {
    if (i === 0) result += '(';
    if (i === 3) result += ') ';
    if (i === 6) result += '-';
    result += limited[i];
  }
  return result;
}
