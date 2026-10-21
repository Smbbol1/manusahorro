import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

export type LaunchableApp = {
  packageName: string;
  name: string;
};

export type RecentForegroundApp = {
  packageName: string;
  timestamp: number;
};

type UltraEcoAndroidModuleType = {
  getLaunchableApps(): Promise<LaunchableApp[]>;
  launchApp(packageName: string): Promise<boolean>;
  canWriteSettings(): boolean;
  openWriteSettings(): Promise<void>;
  canAccessUsageStats(): boolean;
  openUsageSettings(): Promise<void>;
  getRecentForegroundApp(): Promise<RecentForegroundApp | null>;
  isDefaultLauncher(): boolean;
  openHomeSettings(): Promise<void>;
};

const nativeModule =
  Platform.OS === "android"
    ? requireOptionalNativeModule<UltraEcoAndroidModuleType>("UltraEcoAndroid")
    : null;

export const UltraEcoAndroid = nativeModule;
