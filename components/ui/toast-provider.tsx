"use client";

// Compatibility wrapper so older imports keep working.
// Our actual provider & renderer now live in "./toast".
export { ToastProvider } from "./toast";

// If something elsewhere imports { ToasterProvider }, alias it:
export { ToastProvider as ToasterProvider } from "./toast";

// Default export for convenience
export { ToastProvider as default } from "./toast";
