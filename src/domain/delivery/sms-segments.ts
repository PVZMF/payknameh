// MVP §7 / Tech §7.8: SMS cost is per segment, so every send records its segment count and
// the host sees it before a bulk send. Persian text is sent as UCS-2: 70 characters fit in one
// segment, 67 per segment once it is split. Latin-only text uses GSM-7: 160, then 153.

// GSM 03.38 basic character set (one septet each) and extension set (two septets each).
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENSION = "^{}\\[~]|€\f";

export interface SmsSegments {
  encoding: "GSM-7" | "UCS-2";
  /** Characters in the encoding's units (septets or UTF-16 code units). */
  length: number;
  segments: number;
}

function gsmLength(text: string): number | null {
  let length = 0;
  for (const char of text) {
    if (GSM_BASIC.includes(char)) length += 1;
    else if (GSM_EXTENSION.includes(char)) length += 2;
    else return null;
  }
  return length;
}

/** How many SMS segments a message takes, and in which encoding. */
export function countSmsSegments(text: string): SmsSegments {
  const gsm = gsmLength(text);
  if (gsm !== null) {
    return { encoding: "GSM-7", length: gsm, segments: gsm <= 160 ? 1 : Math.ceil(gsm / 153) };
  }
  const length = text.length;
  return { encoding: "UCS-2", length, segments: length <= 70 ? 1 : Math.ceil(length / 67) };
}
