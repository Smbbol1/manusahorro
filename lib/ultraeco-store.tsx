import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import type { LaunchableApp } from "ultraeco-android";

export type UltraEcoPreferences = {
  theme: "oled" | "custom";
  wallpaperUri: string | null;
  allowedApps: LaunchableApp[];
  savedBrightness: number | null;
  savedBrightnessMode: number | null;
};

const PREFS_KEY = "ultraeco.preferences.v1";
const PIN_KEY = "ultraeco.exit.pin.v1";
const WEB_PIN_KEY = "ultraeco.exit.pin.web.v1";
const defaults: UltraEcoPreferences = {
  theme: "oled",
  wallpaperUri: null,
  allowedApps: [],
  savedBrightness: null,
  savedBrightnessMode: null,
};

const colors = { background: "#000000", text: "#F3F6F2", muted: "#99A69D", accent: "#B8F36A" };

type UltraEcoContextValue = {
  preferences: UltraEcoPreferences;
  ready: boolean;
  updatePreferences: (patch: Partial<UltraEcoPreferences>) => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  hasPin: boolean;
  refreshPinState: () => Promise<void>;
};

const UltraEcoContext = createContext<UltraEcoContextValue | null>(null);

async function readPin(): Promise<string | null> {
  if (Platform.OS === "web") return AsyncStorage.getItem(WEB_PIN_KEY);
  return SecureStore.getItemAsync(PIN_KEY);
}

export function UltraEcoProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(defaults);
  const preferencesRef = useRef(defaults);
  const [ready, setReady] = useState(false);
  const [hasPin, setHasPin] = useState(false);

  const refreshPinState = useCallback(async () => {
    setHasPin(Boolean(await readPin()));
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const serialized = await AsyncStorage.getItem(PREFS_KEY);
        if (serialized) {
          const stored = JSON.parse(serialized) as Partial<UltraEcoPreferences>;
          const restored = { ...defaults, ...stored };
          preferencesRef.current = restored;
          if (mounted) setPreferences(restored);
        }
        await refreshPinState();
      } catch {
        // A damaged local preference record falls back to safe defaults.
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshPinState]);

  const updatePreferences = useCallback(async (patch: Partial<UltraEcoPreferences>) => {
    const next = { ...preferencesRef.current, ...patch };
    preferencesRef.current = next;
    setPreferences(next);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
  }, []);

  const setPin = useCallback(async (pin: string) => {
    if (!/^\d{4}$/.test(pin)) throw new Error("El PIN debe tener exactamente cuatro dígitos.");
    if (Platform.OS === "web") await AsyncStorage.setItem(WEB_PIN_KEY, pin);
    else await SecureStore.setItemAsync(PIN_KEY, pin, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
    setHasPin(true);
  }, []);

  const verifyPin = useCallback(async (pin: string) => {
    const saved = await readPin();
    return Boolean(saved) && saved === pin;
  }, []);

  const value = useMemo(
    () => ({ preferences, ready, updatePreferences, setPin, verifyPin, hasPin, refreshPinState }),
    [preferences, ready, updatePreferences, setPin, verifyPin, hasPin, refreshPinState],
  );

  return (
    <UltraEcoContext.Provider value={value}>
      {ready ? children : (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Preparando tu espacio UltraEco…</Text>
        </View>
      )}
    </UltraEcoContext.Provider>
  );
}

export function useUltraEco() {
  const value = useContext(UltraEcoContext);
  if (!value) throw new Error("useUltraEco debe usarse dentro de UltraEcoProvider");
  return value;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: colors.muted, fontSize: 13 },
});
