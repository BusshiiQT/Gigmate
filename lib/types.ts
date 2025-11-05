// lib/types.ts
export type Platform = "Uber" | "Lyft" | "DoorDash" | "Instacart" | "AmazonFlex" | "Other";

export type SettingsRow = {
  id: string;
  user_id: string;
  mileage_rate_cents: number; // e.g., 67 = $0.67/mi
  tax_rate_bps: number;       // e.g., 1500 = 15.00%
  created_at: string | null;
  updated_at: string | null;
};

export type EntryRow = {
  id: string;
  user_id: string;
  platform: Platform;
  started_at: string; // ISO
  ended_at: string;   // ISO
  gross_cents: number;
  tips_cents: number;
  miles: number;
  fuel_cost_cents: number;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};
