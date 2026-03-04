// Profile settings management

import { STORES } from "../utils/constants";
import { getFromStore, updateInStore } from "../utils/database";
import type { ProfileSettings } from "../types";

const DEFAULT_SETTINGS: ProfileSettings = {
  username: "",
  displayName: "",
  avatar: undefined,
  email: undefined,
};

export async function getProfileSettings(): Promise<ProfileSettings> {
  const settings = await getFromStore<ProfileSettings>(STORES.PROFILE_SETTINGS, "default");
  return settings || DEFAULT_SETTINGS;
}

export async function saveProfileSettings(
  settings: Partial<ProfileSettings>
): Promise<ProfileSettings> {
  const current = await getProfileSettings();
  const updated = { ...current, ...settings, id: "default" };
  return updateInStore(STORES.PROFILE_SETTINGS, updated);
}

export async function updateAvatar(avatar: string): Promise<void> {
  const current = await getProfileSettings();
  await saveProfileSettings({ ...current, avatar });
}

export async function removeAvatar(): Promise<void> {
  const current = await getProfileSettings();
  await saveProfileSettings({ ...current, avatar: undefined });
}