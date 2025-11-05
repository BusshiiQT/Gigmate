"use client";

import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="outline" size="sm" onClick={toggle} aria-label="Toggle theme">
      {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
    </Button>
  );
}
