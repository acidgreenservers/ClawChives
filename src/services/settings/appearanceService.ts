// Appearance settings management

import { STORES } from "../utils/constants";
import { getFromStore, updateInStore } from "../utils/database";
import type { AppearanceSettings } from "../types";

const DEFAULT_SETTINGS: AppearanceSettings = {
  theme: "light",
  layout: "grid",
  itemsPerPage: 12,
  sortBy: "dateAdded",
  notifications: true,
  pwaUpdates: true,
};

export async function getAppearanceSettings(): Promise<AppearanceSettings> {
  const settings = await getFromStore<AppearanceSettings>(STORES.APPEARANCE_SETTINGS, "default");
  return settings || DEFAULT_SETTINGS;
}

export async function saveAppearanceSettings(
  settings: Partial<AppearanceSettings>
): Promise<AppearanceSettings> {
  const current = await getAppearanceSettings();
  const updated = { ...current, ...settings, id: "default" };
  return updateInStore(STORES.APPEARANCE_SETTINGS, updated);
}

export async function resetAppearanceSettings(): Promise<AppearanceSettings> {
  return updateInStore(STORES.APPEARANCE_SETTINGS, { ...DEFAULT_SETTINGS, id: "default" });
}

export async function updateTheme(theme: AppearanceSettings["theme"]): Promise<void> {
  const current = await getAppearanceSettings();
  await saveAppearanceSettings({ ...current, theme });
}

export async function updateLayout(layout: AppearanceSettings["layout"]): Promise<void> {
  const current = await getAppearanceSettings();
  await saveAppearanceSettings({ ...current, layout });
}