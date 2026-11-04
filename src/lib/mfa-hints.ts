/**
 * Which second factors a Firebase MFA sign-in challenge offers.
 *
 * An owner can enroll either factor on iOS: "Authenticator app" (TOTP) or
 * "Text message" (SMS). Android has to answer whichever one the account has,
 * so the login screen asks these helpers before it shows a code sheet.
 */

import {
  PhoneMultiFactorGenerator,
  TotpMultiFactorGenerator,
  type MultiFactorInfo,
  type MultiFactorResolver,
  type PhoneMultiFactorInfo,
} from 'firebase/auth';

export function totpHint(resolver: MultiFactorResolver): MultiFactorInfo | null {
  return resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID) ?? null;
}

export function phoneHint(resolver: MultiFactorResolver): PhoneMultiFactorInfo | null {
  const hint = resolver.hints.find((h) => h.factorId === PhoneMultiFactorGenerator.FACTOR_ID);
  return (hint as PhoneMultiFactorInfo | undefined) ?? null;
}
