// Standards §2: expected errors are returned as a typed result with a stable code, never
// thrown. The Persian text for each code lives in src/strings/<module>.ts.

export type Ok<T> = { ok: true; value: T };
export type Err<C extends string> = { ok: false; code: C };
export type Result<T, C extends string> = Ok<T> | Err<C>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<C extends string>(code: C): Err<C> {
  return { ok: false, code };
}
