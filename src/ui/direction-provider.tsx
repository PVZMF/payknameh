"use client";

import type { ReactNode } from "react";
import { Direction } from "radix-ui";

/** Radix components (menus, sliders, tabs) read direction from context, not from CSS. */
export function RtlProvider({ children }: { children: ReactNode }) {
  return <Direction.Provider dir="rtl">{children}</Direction.Provider>;
}
