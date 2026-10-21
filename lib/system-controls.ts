import { Platform } from "react-native";
import * as Brightness from "expo-brightness";

import { UltraEcoAndroid } from "ultraeco-android";
import type { UltraEcoPreferences } from "@/lib/ultraeco-store";

export type UpdatePreferences = (patch: Partial<UltraEcoPreferences>) => Promise<void>;

export async function applyLowBrightness(
  preferences: UltraEcoPreferences,
  updatePreferences: UpdatePreferences,
): Promise<"applied" | "settings-opened" | "unsupported"> {
  if (Platform.OS !== "android" || !UltraEcoAndroid) return "unsupported";
  if (!UltraEcoAndroid.canWriteSettings()) {
    await UltraEcoAndroid.openWriteSettings();
    return "settings-opened";
  }

  const savedBrightness =
    preferences.savedBrightness ?? (await Brightness.getSystemBrightnessAsync());
  const savedBrightnessMode =
    preferences.savedBrightnessMode ?? (await Brightness.getSystemBrightnessModeAsync());

  await updatePreferences({ savedBrightness, savedBrightnessMode });
  try {
    await Brightness.setSystemBrightnessAsync(0.12);
    return "applied";
  } catch (error) {
    if (preferences.savedBrightness === null) {
      await updatePreferences({ savedBrightness: null, savedBrightnessMode: null });
    }
    throw error;
  }
}

export async function restoreBrightness(
  preferences: UltraEcoPreferences,
  updatePreferences: UpdatePreferences,
): Promise<boolean> {
  if (preferences.savedBrightness === null) return true;
  if (Platform.OS !== "android" || !UltraEcoAndroid || !UltraEcoAndroid.canWriteSettings()) return false;

  await Brightness.setSystemBrightnessAsync(preferences.savedBrightness);
  if (preferences.savedBrightnessMode !== null) {
    await Brightness.setSystemBrightnessModeAsync(
      preferences.savedBrightnessMode as Brightness.BrightnessMode,
    );
  }
  await updatePreferences({ savedBrightness: null, savedBrightnessMode: null });
  return true;
}
