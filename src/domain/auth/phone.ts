import { err, ok, type Result } from "@/domain/shared/result";
import { toLatinDigits } from "@/domain/shared/digits";

// MVP §3.1 / Tech §7.3: hosts log in with an Iranian mobile number; every input form is
// normalized to E.164 here, in the domain layer, before it is stored or compared.

/** An Iranian mobile number in E.164 form: +989XXXXXXXXX. */
export type PhoneE164 = string & { readonly __brand: "PhoneE164" };

export type PhoneError = "PHONE_INVALID";

// Spaces, dashes, dots, brackets, and the invisible direction and joiner marks that numbers
// copied from Persian text often carry.
const IGNORED = /[\s\-.()‌-‏‪-‮⁦-⁩]/g;
const IRANIAN_MOBILE = /^9\d{9}$/;

/**
 * Normalizes an Iranian mobile number to E.164.
 * Accepts 0912…, 912…, +98912…, 98912… and 0098912…, in Latin, Persian or Arabic digits.
 * Returns PHONE_INVALID for anything that is not an Iranian mobile number.
 */
export function normalizePhone(input: string): Result<PhoneE164, PhoneError> {
  let digits = toLatinDigits(input).replace(IGNORED, "");
  if (digits.startsWith("+98")) digits = digits.slice(3);
  else if (digits.startsWith("0098")) digits = digits.slice(4);
  else if (digits.startsWith("98") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);

  if (!IRANIAN_MOBILE.test(digits)) return err("PHONE_INVALID");
  return ok(`+98${digits}` as PhoneE164);
}

/** For screens: 0912•••4567, so the host can recognise the number without it being shown. */
export function maskPhoneForDisplay(phone: PhoneE164): string {
  const local = `0${phone.slice(3)}`;
  return `${local.slice(0, 4)}•••${local.slice(-4)}`;
}
