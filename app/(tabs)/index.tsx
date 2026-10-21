import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { UltraEcoAndroid } from "ultraeco-android";

import { AppButton, AppPage, Card, Eyebrow, palette, SectionHeading } from "@/components/ultraeco-ui";
import { useUltraEco } from "@/lib/ultraeco-store";
import { restoreBrightness } from "@/lib/system-controls";

export default function HomeScreen() {
  const router = useRouter();
  const { preferences, updatePreferences, verifyPin, hasPin } = useUltraEco();
  const [isDefaultLauncher, setIsDefaultLauncher] = useState(false);
  const [usageEnabled, setUsageEnabled] = useState(false);
  const [recentPackage, setRecentPackage] = useState<string | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  const customWallpaper = preferences.theme === "custom" ? preferences.wallpaperUri : null;
  const recentApp = useMemo(
    () => preferences.allowedApps.find((app) => app.packageName === recentPackage),
    [preferences.allowedApps, recentPackage],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        if (!UltraEcoAndroid) return;
        try {
          const [isDefault, hasUsageAccess] = [
            UltraEcoAndroid.isDefaultLauncher(),
            UltraEcoAndroid.canAccessUsageStats(),
          ];
          if (!active) return;
          setIsDefaultLauncher(isDefault);
          setUsageEnabled(hasUsageAccess);
          if (hasUsageAccess) {
            const recent = await UltraEcoAndroid.getRecentForegroundApp();
            if (active) setRecentPackage(recent?.packageName ?? null);
          } else {
            setRecentPackage(null);
          }
        } catch {
          if (active) {
            setIsDefaultLauncher(false);
            setUsageEnabled(false);
          }
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const handleOpenApp = async (packageName: string) => {
    if (!UltraEcoAndroid) {
      Alert.alert("Disponible en Android", "Instala el APK en un dispositivo Android para abrir aplicaciones.");
      return;
    }
    try {
      await UltraEcoAndroid.launchApp(packageName);
    } catch {
      Alert.alert("No se pudo abrir", "La aplicación quizá se desinstaló o ya no ofrece un acceso de launcher.");
    }
  };

  const openExit = () => {
    setPin("");
    setPinError("");
    setExitOpen(true);
  };

  const submitExit = async () => {
    if (!hasPin) {
      setPinError("Primero configura el PIN de salida en Ajustes.");
      return;
    }
    if (!(await verifyPin(pin))) {
      setPinError("PIN incorrecto. Inténtalo de nuevo.");
      return;
    }
    try {
      const restored = await restoreBrightness(preferences, updatePreferences);
      setExitOpen(false);
      if (UltraEcoAndroid) {
        if (!restored) {
          Alert.alert(
            "Permiso de brillo revocado",
            "Android retiró WRITE_SETTINGS. Cambia el brillo manualmente en Ajustes y luego elige otro launcher.",
          );
        }
        await UltraEcoAndroid.openHomeSettings();
      } else {
        Alert.alert("Salida confirmada", "En Android puedes elegir otro launcher desde los Ajustes de inicio.");
      }
    } catch {
      setPinError("No se pudo restaurar el brillo. Revisa el acceso WRITE_SETTINGS en Ajustes.");
    }
  };

  return (
    <AppPage style={preferences.theme === "oled" ? styles.oledPage : undefined} backgroundImageUri={customWallpaper}>
      <View style={styles.header}>
        <View style={styles.brandMark}>
          <Ionicons name="flash" size={17} color={palette.background} />
        </View>
        <View style={styles.brandText}>
          <Text style={styles.brandName}>UltraEco</Text>
          <Text style={styles.brandSub}>LAUNCHER ESENCIAL</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push("/settings")} style={styles.headerButton}>
          <Ionicons name="options-outline" size={21} color={palette.text} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroTopline}>
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>{isDefaultLauncher ? "INICIO ACTIVO" : "LISTO PARA CONFIGURAR"}</Text>
        </View>
        <Text style={styles.heroTitle}>Lo esencial.{"\n"}Nada de más.</Text>
        <Text style={styles.heroCopy}>
          Un espacio simple para tus aplicaciones importantes. UltraEco organiza tu inicio; no cierra ni bloquea otras apps.
        </Text>
        <View style={styles.heroFooter}>
          <View style={styles.heroMetric}>
            <Ionicons name="apps-outline" size={18} color={palette.lime} />
            <Text style={styles.heroMetricText}>{preferences.allowedApps.length} de 10 accesos</Text>
          </View>
          <View style={styles.heroMetric}>
            <Ionicons name="sunny-outline" size={18} color={palette.amber} />
            <Text style={styles.heroMetricText}>{preferences.savedBrightness !== null ? "Brillo al 12%" : "Brillo normal"}</Text>
          </View>
        </View>
      </View>

      {!isDefaultLauncher && Platform.OS === "android" ? (
        <Card style={styles.setupCard}>
          <View style={styles.setupIcon}><Ionicons name="home-outline" size={20} color={palette.lime} /></View>
          <View style={styles.setupText}>
            <Text style={styles.cardTitle}>Haz de UltraEco tu inicio</Text>
            <Text style={styles.cardCopy}>Android te pedirá elegirlo; la selección siempre la controlas tú.</Text>
          </View>
          <AppButton label="Elegir" compact onPress={() => UltraEcoAndroid?.openHomeSettings()} />
        </Card>
      ) : null}

      <View style={styles.sectionHeader}>
        <SectionHeading title="Tus esenciales" subtitle="Accesos directos elegidos por ti" />
        <Pressable accessibilityRole="button" onPress={() => router.push("/settings")}>
          <Text style={styles.manageLink}>Editar</Text>
        </Pressable>
      </View>

      {preferences.allowedApps.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.appStrip}>
          {preferences.allowedApps.map((app, index) => (
            <Pressable key={app.packageName} style={styles.appShortcut} onPress={() => void handleOpenApp(app.packageName)}>
              <View style={[styles.appIcon, index % 3 === 1 && styles.appIconAmber, index % 3 === 2 && styles.appIconOlive]}>
                <Text style={styles.appInitial}>{app.name.trim().charAt(0).toUpperCase() || "A"}</Text>
              </View>
              <Text style={styles.appName} numberOfLines={1}>{app.name}</Text>
            </Pressable>
          ))}
          {preferences.allowedApps.length < 10 ? (
            <Pressable style={styles.addShortcut} onPress={() => router.push("/settings")}>
              <Ionicons name="add" size={25} color={palette.lime} />
              <Text style={styles.addLabel}>Añadir</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : (
        <Pressable onPress={() => router.push("/settings")}>
          <Card style={styles.emptyApps}>
            <View style={styles.emptyIcon}><Ionicons name="add" size={22} color={palette.lime} /></View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.cardTitle}>Elige tus aplicaciones</Text>
              <Text style={styles.cardCopy}>Añade hasta diez accesos directos a tu pantalla de inicio.</Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={palette.muted} />
          </Card>
        </Pressable>
      )}

      <Card style={styles.insightCard}>
        <View style={styles.insightHead}>
          <View style={styles.insightIcon}><Ionicons name="time-outline" size={18} color={palette.amber} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Actividad reciente</Text>
            <Text style={styles.cardCopy}>Solo se consulta al abrir esta pantalla.</Text>
          </View>
          <View style={[styles.accessPill, usageEnabled && styles.accessPillOn]}>
            <Text style={[styles.accessPillText, usageEnabled && styles.accessPillTextOn]}>{usageEnabled ? "ACTIVO" : "OPCIONAL"}</Text>
          </View>
        </View>
        <View style={styles.insightResult}>
          <Text style={styles.recentApp}>{usageEnabled ? (recentApp?.name ?? recentPackage ?? "Sin actividad reciente") : "No se consulta sin tu permiso"}</Text>
          {!usageEnabled ? (
            <Pressable onPress={() => router.push("/settings")}><Text style={styles.manageLink}>Configurar</Text></Pressable>
          ) : null}
        </View>
      </Card>

      <View style={styles.bottomNote}>
        <Ionicons name={preferences.theme === "oled" ? "moon" : "image-outline"} size={15} color={palette.lime} />
        <Text style={styles.bottomNoteText}>{preferences.theme === "oled" ? "Tema OLED · negro absoluto" : "Fondo personal"}</Text>
        {preferences.wallpaperUri ? <Image source={{ uri: preferences.wallpaperUri }} style={styles.wallpaperThumb} /> : null}
      </View>

      <AppButton label="Salir de UltraEco" tone="outline" onPress={openExit} />
      <Text style={styles.exitHint}>Confirma con tu PIN y Android te permitirá elegir otro launcher.</Text>

      <Modal visible={exitOpen} transparent animationType="fade" onRequestClose={() => setExitOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pinCard}>
            <View style={styles.modalIcon}><Ionicons name="lock-closed-outline" size={22} color={palette.lime} /></View>
            <Text style={styles.modalTitle}>Confirmar salida</Text>
            <Text style={styles.modalCopy}>El PIN confirma la salida de UltraEco. La selección final del launcher la hace Android.</Text>
            <TextInput
              value={pin}
              onChangeText={(value) => { setPin(value.replace(/\D/g, "").slice(0, 4)); setPinError(""); }}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="••••"
              placeholderTextColor={palette.dim}
              style={styles.pinInput}
              accessibilityLabel="PIN de salida de cuatro dígitos"
            />
            {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
            <AppButton label="Confirmar y abrir Ajustes" onPress={() => void submitExit()} />
            <AppButton label="Cancelar" tone="quiet" onPress={() => setExitOpen(false)} />
          </View>
        </View>
      </Modal>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  oledPage: { backgroundColor: "#000000" },
  header: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 2 },
  brandMark: { width: 34, height: 34, borderRadius: 12, backgroundColor: palette.lime, alignItems: "center", justifyContent: "center" },
  brandText: { flex: 1, gap: 1 },
  brandName: { color: palette.text, fontSize: 17, fontWeight: "800", letterSpacing: -0.2 },
  brandSub: { color: palette.dim, fontSize: 9, fontWeight: "800", letterSpacing: 1.25 },
  headerButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: "rgba(20,27,22,0.9)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.line },
  hero: { backgroundColor: "rgba(15,21,17,0.96)", borderColor: palette.line, borderWidth: 1, borderRadius: 28, padding: 22, gap: 12, overflow: "hidden" },
  heroTopline: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.lime },
  liveLabel: { color: palette.lime, fontSize: 10, letterSpacing: 1.45, fontWeight: "800" },
  heroTitle: { color: palette.text, fontSize: 36, lineHeight: 40, fontWeight: "700", letterSpacing: -1.1, marginTop: 3 },
  heroCopy: { color: palette.muted, fontSize: 14, lineHeight: 21, maxWidth: 310 },
  heroFooter: { borderTopColor: palette.line, borderTopWidth: 1, paddingTop: 14, marginTop: 4, flexDirection: "row", justifyContent: "space-between", gap: 8 },
  heroMetric: { flexDirection: "row", alignItems: "center", gap: 7 },
  heroMetricText: { color: palette.text, fontSize: 11, fontWeight: "600" },
  setupCard: { flexDirection: "row", alignItems: "center", padding: 14, gap: 11 },
  setupIcon: { width: 39, height: 39, borderRadius: 14, backgroundColor: palette.limeDeep, alignItems: "center", justifyContent: "center" },
  setupText: { flex: 1, gap: 3 },
  cardTitle: { color: palette.text, fontSize: 14, fontWeight: "700" },
  cardCopy: { color: palette.muted, fontSize: 12, lineHeight: 17 },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  manageLink: { color: palette.lime, fontSize: 13, fontWeight: "700", paddingBottom: 4 },
  appStrip: { gap: 15, paddingVertical: 2 },
  appShortcut: { alignItems: "center", width: 68, gap: 8 },
  appIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: palette.limeDeep, borderWidth: 1, borderColor: "#40592E", alignItems: "center", justifyContent: "center" },
  appIconAmber: { backgroundColor: "#35291A", borderColor: "#5A4423" },
  appIconOlive: { backgroundColor: "#253025", borderColor: "#39483A" },
  appInitial: { color: palette.lime, fontSize: 22, fontWeight: "800" },
  appName: { color: palette.text, fontSize: 11, maxWidth: 68 },
  addShortcut: { width: 68, alignItems: "center", justifyContent: "center", gap: 8 },
  addLabel: { color: palette.muted, fontSize: 11 },
  emptyApps: { flexDirection: "row", alignItems: "center", padding: 15 },
  emptyIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: palette.limeDeep, alignItems: "center", justifyContent: "center" },
  insightCard: { gap: 12 },
  insightHead: { flexDirection: "row", alignItems: "center", gap: 11 },
  insightIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: "#302717", alignItems: "center", justifyContent: "center" },
  accessPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: "#24291F" },
  accessPillOn: { backgroundColor: palette.limeDeep },
  accessPillText: { color: palette.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.7 },
  accessPillTextOn: { color: palette.lime },
  insightResult: { borderTopColor: palette.line, borderTopWidth: 1, paddingTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  recentApp: { color: palette.text, fontSize: 13, fontWeight: "600", flex: 1 },
  bottomNote: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 1 },
  bottomNoteText: { color: palette.muted, fontSize: 12, flex: 1 },
  wallpaperThumb: { width: 32, height: 32, borderRadius: 10 },
  exitHint: { color: palette.dim, fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: -9 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.78)", justifyContent: "center", padding: 22 },
  pinCard: { backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1, borderRadius: 26, padding: 22, gap: 12 },
  modalIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: palette.limeDeep, alignItems: "center", justifyContent: "center" },
  modalTitle: { color: palette.text, fontSize: 21, fontWeight: "700" },
  modalCopy: { color: palette.muted, fontSize: 13, lineHeight: 19 },
  pinInput: { color: palette.text, backgroundColor: "#080B09", borderWidth: 1, borderColor: palette.line, borderRadius: 15, height: 56, textAlign: "center", fontSize: 23, letterSpacing: 12 },
  pinError: { color: palette.danger, fontSize: 12 },
});
