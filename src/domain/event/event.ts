import { z } from "zod";

// MVP §2, §3.2, §5: Event is the container for the celebration. It holds general info only;
// date, time and place belong to Session.

export const EVENT_TYPES = ["WEDDING"] as const;
export const DEFAULT_TIMEZONE = "Asia/Tehran";

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

/** Input for creating an event, parsed at every entrypoint (Standards §2). */
export const createEventSchema = z.object({
  title: z.string().trim().min(1).max(120),
  eventType: z.enum(EVENT_TYPES).default("WEDDING"),
  // Phase 1 decision: the couple as two optional fields, so other event types fit later.
  brideName: optionalText(60),
  groomName: optionalText(60),
  parents: optionalText(300),
  timezone: z.string().refine(isTimeZone, "unknown time zone").default(DEFAULT_TIMEZONE),
});

export type CreateEventInput = z.output<typeof createEventSchema>;
