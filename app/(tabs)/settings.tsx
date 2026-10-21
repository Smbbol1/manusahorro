import { Ionicons } from "@expo/vector-icons";
import * as Brightness from "expo-brightness";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { UltraEcoAndroid, type LaunchableApp } from "ultraeco-android";

import { AppButton, AppPage, Card, Divider, Eyebrow, palette, SectionHeading } from "@/components/ultraeco-ui";
import { applyLowBrightness } from "@/lib/system-controls";
import { useUltraEco } from "@/lib/ultraeco-store";

export default function SettingsScreen() {
  const { preferences, updatePreferences, hasPin, setPin, verifyPin } = useUltraEco();
  const [launcherSelected, setLauncherSelected] = useState(false);
  const [writeSettingsAllowed, setWriteSettingsAllowed] = useState(false);
  const [usageAllowed, setUsageAllowed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [installedApps, setInstalledApps] = useState<LaunchableApp[]>([]);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState("");

  const refreshSpecialAccess = useCallback(() => {
    if (!UltraEcoAndroid) return;
    setLauncherSelected(UltraEcoAndroid.isDefaultLauncher());
    setWriteSettingsAllowed(UltraEcoAndroid.canWriteSettings());
    setUsageAllowed(UltraEcoAndroid.canAccessUsageStats());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshSpecialAccess();
      return undefined;
    }, [refreshSpecialAccess]),
  );

  const handleWallpaperPick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const directory = FileSystem.documentDirectory;
      if (!directory) throw new Error("No hay almacenamiento local disponible");
      const extension = asset.fileName?.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
      const destination = `${directory}ultraeco-wallpaper-${Date.now()}.${extension}`;
      await FileSystem.copyAsync({ from: asset.uri, to: destination });
      await updatePreferences({ theme: "custom", wallpaperUri: destination });
    } catch {
      Alert.alert("No se pudo guardar el fondo", "Vuelve a elegir una imagen desde Photo Picker.");
    }
  };

  const openAppPicker = async () => {
    if (!UltraEcoAndroid) {
      Alert.alert("Disponible en Android", "El listado de apps instaladas se consulta desde el APK Android, no desde la vista web.");
      return;
    }
    try {
      const apps = await UltraEcoAndroid.getLaunchableApps();
      setInstalledApps(apps);
      setPickerOpen(true);
    } catch {
      Alert.alert("No se pudo leer el launcher", "Revisa que el APK tenga la configuración Android actualizada.");
    }
  };

  const toggleApp = async (app: LaunchableApp) => {
    const selected = preferences.allowedApps.some((item) => item.packageName === app.packageName);
    if (selected) {
      await updatePreferences({ allowedApps: preferences.allowedApps.filter((item) => item.packageName !== app.packageName) });
      return;
    }
    if (preferences.allowedApps.length >= 10) {
      Alert.alert("Límite alcanzado", "La lista blanca admite hasta diez aplicaciones.");
      return;
    }
    await updatePreferences({ allowedApps: [...preferences.allowedApps, app] });
  };

  const toggleLowBrightness = async () => {
    if (preferences.savedBrightness !== null) {
      Alert.alert(
        "Restaurar brillo",
        "Se restaurará el nivel y el modo de brillo que guardaste antes de activar UltraEco.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Restaurar",
            onPress: async () => {
              try {
                await Brightness.setSystemBrightnessAsync(preferences.savedBrightness as number);
                if (preferences.savedBrightnessMode !== null) {
                  await Brightness.setSystemBrightnessModeAsync(preferences.savedBrightnessMode as Brightness.BrightnessMode);
                }
                await updatePreferences({ savedBrightness: null, savedBrightnessMode: null });
              } catch {
                Alert.alert("Acceso necesario", "Concede WRITE_SETTINGS en Ajustes para restaurar el brillo guardado.");
              }
            },
          },
        ],
      );
      return;
    }

    try {
      const result = await applyLowBrightness(preferences, updatePreferences);
      if (result === "unsupported") Alert.alert("Solo Android", "El control del brillo global está disponible en el APK Android.");
      if (result === "settings-opened") Alert.alert("Concede el acceso", "Activa «Permitir modificar ajustes del sistema» para UltraEco y vuelve a esta pantalla.");
      if (result === "applied") setWriteSettingsAllowed(true);
    } catch {
      Alert.alert("No se pudo cambiar el brillo", "Comprueba el acceso especial WRITE_SETTINGS en Ajustes.");
    }
  };

  const savePin = async () => {
    if (!/^\d{4}$/.test(newPin)) {
      setPinError("El nuevo PIN debe tener exactamente cuatro dígitos.");
      return;
    }
    if (hasPin && !(await verifyPin(currentPin))) {
      setPinError("El PIN actual no coincide.");
      return;
    }
    try {
      await setPin(newPin);
      setPinModalOpen(false);
      setCurrentPin("");
      setNewPin("");
      setPinError("");
      Alert.alert("PIN guardado", "El PIN se guarda localmente y solo confirma la salida desde UltraEco.");
    } catch {
      setPinError("No se pudo guardar el PIN en el dispositivo.");
    }
  };

  return (
    <AppPage>
      <View style={styles.header}>
        <Eyebrow>PERSONALIZA TU INICIO</Eyebrow>
        <Text style={styles.title}>Ajustes</Text>
        <Text style={styles.intro}>Controles claros, locales y reversibles. No se cambian ajustes del sistema sin tu permiso.</Text>
      </View>

      <Card>
        <Eyebrow>GUÍA INICIAL · 3 PASOS</Eyebrow>
        <View style={styles.rowTop}>
          <View style={styles.appMark}><Text style={styles.appMarkText}>1</Text></View>
          <View style={styles.rowText}>
            <Text style={styles.cardTitle}>Elige UltraEco como inicio</Text>
            <Text style={styles.cardCopy}>Android mostrará la selección del launcher y tú confirmarás el cambio.</Text>
          </View>
        </View>
        <AppButton label="Abrir ajustes de inicio" tone="quiet" onPress={() => UltraEcoAndroid?.openHomeSettings()} />
        <Divider />
        <View style={styles.rowTop}>
          <View style={styles.appMark}><Text style={styles.appMarkText}>2</Text></View>
          <View style={styles.rowText}>
            <Text style={styles.cardTitle}>Actividad reciente · opcional</Text>
            <Text style={styles.cardCopy}>Concede estadísticas de uso solo si quieres ver qué app usaste recientemente.</Text>
          </View>
        </View>
        <AppButton label="Abrir acceso de uso" tone="quiet" onPress={() => UltraEcoAndroid?.openUsageSettings()} />
        <Divider />
        <View style={styles.rowTop}>
          <View style={styles.appMark}><Text style={styles.appMarkText}>3</Text></View>
          <View style={styles.rowText}>
            <Text style={styles.cardTitle}>Brillo al 12% · opcional</Text>
            <Text style={styles.cardCopy}>Concede WRITE_SETTINGS solo si quieres reducir el brillo global y restaurarlo después.</Text>
          </View>
        </View>
        <AppButton label="Abrir permiso de brillo" tone="quiet" onPress={() => UltraEcoAndroid?.openWriteSettings()} />
        <Text style={styles.footnote}>No necesitas activar «Ajustes restringidos» ni habilitar Accesibilidad. Sin permiso de notificaciones, overlay o cierre automático de apps.</Text>
      </Card>

      <Card>
        <View style={styles.rowTop}>
          <View style={styles.iconTile}><Ionicons name="home-outline" size={19} color={palette.lime} /></View>
          <View style={styles.rowText}>
            <Text style={styles.cardTitle}>Launcher predeterminado</Text>
            <Text style={styles.cardCopy}>{launcherSelected ? "UltraEco está seleccionado como inicio." : "Android conserva la decisión final."}</Text>
          </View>
          <View style={[styles.statusDot, launcherSelected && styles.statusDotOn]} />
        </View>
        <AppButton label={launcherSelected ? "Abrir ajustes de inicio" : "Elegir UltraEco en Android"} tone="quiet" onPress={() => UltraEcoAndroid?.openHomeSettings()} />
      </Card>

      <View style={styles.section}>
        <SectionHeading title="Apariencia" subtitle="Diseñado para una pantalla simple y de bajo consumo visual" />
        <Card style={styles.themeCard}>
          <Pressable onPress={() => void updatePreferences({ theme: "oled" })} style={styles.themeOption}>
            <View style={styles.themePreviewOled}><View style={styles.previewMark} /></View>
            <View style={styles.rowText}>
              <Text style={styles.cardTitle}>Modo OLED</Text>
              <Text style={styles.cardCopy}>Negro absoluto · #000000</Text>
            </View>
            <Ionicons name={preferences.theme === "oled" ? "radio-button-on" : "radio-button-off"} size={21} color={preferences.theme === "oled" ? palette.lime : palette.dim} />
          </Pressable>
          <Divider />
          <Pressable onPress={() => { if (preferences.wallpaperUri) void updatePreferences({ theme: "custom" }); else void handleWallpaperPick(); }} style={styles.themeOption}>
            <View style={styles.themePreviewCustom}>
              {preferences.wallpaperUri ? <Image source={{ uri: preferences.wallpaperUri }} style={styles.previewImage} /> : <Ionicons name="image-outline" size={20} color={palette.muted} />}
            </View>
            <View style={styles.rowText}>
              <Text style={styles.cardTitle}>Fondo personal</Text>
              <Text style={styles.cardCopy}>Seleccionado con Photo Picker</Text>
            </View>
            <Ionicons name={preferences.theme === "custom" ? "radio-button-on" : "radio-button-off"} size={21} color={preferences.theme === "custom" ? palette.lime : palette.dim} />
          </Pressable>
          <AppButton label={preferences.wallpaperUri ? "Elegir otra imagen" : "Elegir imagen"} tone="outline" onPress={() => void handleWallpaperPick()} />
          <Text style={styles.footnote}>La imagen se copia al almacenamiento privado de UltraEco. No se solicita READ_MEDIA_IMAGES.</Text>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeading title="Aplicaciones" subtitle={`${preferences.allowedApps.length} de 10 accesos seleccionados`} />
        <Card>
          {preferences.allowedApps.length ? preferences.allowedApps.map((app, index) => (
            <View key={app.packageName} style={[styles.allowedRow, index > 0 && styles.allowedRowBorder]}>
              <View style={styles.appMark}><Text style={styles.appMarkText}>{app.name.charAt(0).toUpperCase()}</Text></View>
              <View style={styles.rowText}>
                <Text style={styles.cardTitle}>{app.name}</Text>
                <Text style={styles.packageName} numberOfLines={1}>{app.packageName}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${app.name}`} onPress={() => void toggleApp(app)} style={styles.removeButton}>
                <Ionicons name="close" size={18} color={palette.muted} />
              </Pressable>
            </View>
          )) : (
            <View style={styles.emptyRow}>
              <Ionicons name="apps-outline" size={20} color={palette.lime} />
              <Text style={styles.cardCopy}>Aún no hay accesos seleccionados.</Text>
            </View>
          )}
          <AppButton label="Explorar apps instaladas" tone="quiet" onPress={() => void openAppPicker()} />
          <Text style={styles.footnote}>La lista solo crea accesos en UltraEco; no detiene ni bloquea otras aplicaciones.</Text>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeading title="Controles del dispositivo" subtitle="Los accesos especiales se conceden manualmente en Ajustes" />
        <Card>
          <View style={styles.rowTop}>
            <View style={[styles.iconTile, styles.amberTile]}><Ionicons name="sunny-outline" size={19} color={palette.amber} /></View>
            <View style={styles.rowText}>
              <Text style={styles.cardTitle}>Brillo global</Text>
              <Text style={styles.cardCopy}>{preferences.savedBrightness !== null ? "Ajustado al 12%; valor anterior guardado." : "Opcional · requiere WRITE_SETTINGS."}</Text>
            </View>
            <View style={[styles.statusDot, writeSettingsAllowed && styles.statusDotOn]} />
          </View>
          <AppButton label={preferences.savedBrightness !== null ? "Restaurar brillo previo" : "Reducir brillo al 12%"} tone="quiet" onPress={() => void toggleLowBrightness()} />
          <Divider />
          <View style={styles.rowTop}>
            <View style={styles.iconTile}><Ionicons name="time-outline" size={19} color={palette.lime} /></View>
            <View style={styles.rowText}>
              <Text style={styles.cardTitle}>Actividad reciente</Text>
              <Text style={styles.cardCopy}>{usageAllowed ? "Acceso concedido; consulta puntual al abrir Inicio." : "Opcional · requiere acceso a estadísticas de uso."}</Text>
            </View>
            <View style={[styles.statusDot, usageAllowed && styles.statusDotOn]} />
          </View>
          <AppButton label={usageAllowed ? "Administrar acceso" : "Configurar estadísticas"} tone="quiet" onPress={() => UltraEcoAndroid?.openUsageSettings()} />
          <Text style={styles.footnote}>Sin servicio en segundo plano: la consulta ocurre al entrar a Inicio y no fuerza detenciones.</Text>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeading title="Salida protegida" subtitle="Un PIN confirma la salida desde la interfaz, no bloquea Android" />
        <Card>
          <View style={styles.rowTop}>
            <View style={styles.iconTile}><Ionicons name="lock-closed-outline" size={19} color={palette.lime} /></View>
            <View style={styles.rowText}>
              <Text style={styles.cardTitle}>{hasPin ? "PIN configurado" : "Configura un PIN de 4 dígitos"}</Text>
              <Text style={styles.cardCopy}>Guardado localmente en el dispositivo.</Text>
            </View>
          </View>
          <AppButton label={hasPin ? "Cambiar PIN" : "Configurar PIN"} tone="outline" onPress={() => { setPinError(""); setPinModalOpen(true); }} />
        </Card>
      </View>

      <Card style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color={palette.amber} />
        <Text style={styles.cardCopy}>No se requiere Accesibilidad, «Ajustes restringidos», notificaciones ni acceso a fotos completo para las funciones actuales. Android siempre permite cambiar de launcher desde Ajustes.</Text>
      </Card>

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalPage}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Eyebrow>ACCESOS DEL LAUNCHER</Eyebrow>
              <Text style={styles.modalTitle}>Elige hasta diez apps</Text>
            </View>
            <Pressable onPress={() => setPickerOpen(false)} style={styles.closeButton}><Ionicons name="close" size={21} color={palette.text} /></Pressable>
          </View>
          <Text style={styles.cardCopy}>Toca una app para añadirla o quitarla. Solo se mostrarán apps que Android ofrece como acceso de inicio.</Text>
          <ScrollView contentContainerStyle={styles.appList}>
            {installedApps.map((app) => {
              const selected = preferences.allowedApps.some((item) => item.packageName === app.packageName);
              return (
                <Pressable key={app.packageName} onPress={() => void toggleApp(app)} style={styles.appListRow}>
                  <View style={styles.appMark}><Text style={styles.appMarkText}>{app.name.charAt(0).toUpperCase()}</Text></View>
                  <View style={styles.rowText}>
                    <Text style={styles.cardTitle}>{app.name}</Text>
                    <Text style={styles.packageName}>{app.packageName}</Text>
                  </View>
                  <Ionicons name={selected ? "checkmark-circle" : "add-circle-outline"} size={23} color={selected ? palette.lime : palette.muted} />
                </Pressable>
              );
            })}
            {!installedApps.length ? <Text style={styles.cardCopy}>No se encontraron aplicaciones de launcher.</Text> : null}
          </ScrollView>
          <AppButton label={`Listo · ${preferences.allowedApps.length}/10`} onPress={() => setPickerOpen(false)} />
        </View>
      </Modal>

      <Modal visible={pinModalOpen} transparent animationType="fade" onRequestClose={() => setPinModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pinCard}>
            <Text style={styles.modalTitle}>{hasPin ? "Cambiar PIN" : "Crear PIN de salida"}</Text>
            <Text style={styles.cardCopy}>Elige cuatro dígitos. Este PIN solo confirma la salida dentro de UltraEco.</Text>
            {hasPin ? (
              <TextInput
                value={currentPin}
                onChangeText={(value) => { setCurrentPin(value.replace(/\D/g, "").slice(0, 4)); setPinError(""); }}
                keyboardType="number-pad" secureTextEntry maxLength={4} placeholder="PIN actual"
                placeholderTextColor={palette.dim} style={styles.pinInput} accessibilityLabel="PIN actual"
              />
            ) : null}
            <TextInput
              value={newPin}
              onChangeText={(value) => { setNewPin(value.replace(/\D/g, "").slice(0, 4)); setPinError(""); }}
              keyboardType="number-pad" secureTextEntry maxLength={4} placeholder="Nuevo PIN de 4 dígitos"
              placeholderTextColor={palette.dim} style={styles.pinInput} accessibilityLabel="Nuevo PIN de cuatro dígitos"
            />
            {pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}
            <AppButton label="Guardar PIN" onPress={() => void savePin()} />
            <AppButton label="Cancelar" tone="quiet" onPress={() => setPinModalOpen(false)} />
          </View>
        </View>
      </Modal>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8, marginBottom: 2 },
  title: { color: palette.text, fontSize: 34, lineHeight: 40, fontWeight: "700", letterSpacing: -1 },
  intro: { color: palette.muted, fontSize: 14, lineHeight: 20, maxWidth: 340 },
  section: { gap: 12 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconTile: { width: 42, height: 42, borderRadius: 15, backgroundColor: palette.limeDeep, alignItems: "center", justifyContent: "center" },
  amberTile: { backgroundColor: "#342916" },
  rowText: { flex: 1, gap: 4 },
  cardTitle: { color: palette.text, fontSize: 14, fontWeight: "700" },
  cardCopy: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.dim },
  statusDotOn: { backgroundColor: palette.lime },
  themeCard: { gap: 15 },
  themeOption: { flexDirection: "row", alignItems: "center", gap: 12 },
  themePreviewOled: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#000", borderColor: "#2F3A32", borderWidth: 1, alignItems: "center", justifyContent: "center" },
  previewMark: { width: 14, height: 14, borderRadius: 5, backgroundColor: palette.lime },
  themePreviewCustom: { width: 42, height: 42, borderRadius: 14, backgroundColor: palette.surfaceRaised, borderWidth: 1, borderColor: palette.line, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  previewImage: { width: 42, height: 42 },
  footnote: { color: palette.dim, fontSize: 11, lineHeight: 16 },
  allowedRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 3 },
  allowedRowBorder: { borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 13 },
  appMark: { width: 40, height: 40, borderRadius: 14, backgroundColor: palette.limeDeep, alignItems: "center", justifyContent: "center" },
  appMarkText: { color: palette.lime, fontSize: 17, fontWeight: "800" },
  packageName: { color: palette.dim, fontSize: 10 },
  removeButton: { width: 34, height: 34, borderRadius: 12, backgroundColor: palette.surfaceRaised, alignItems: "center", justifyContent: "center" },
  emptyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 11, backgroundColor: "#201D15", borderColor: "#3F3725" },
  modalPage: { flex: 1, backgroundColor: palette.background, paddingTop: 60, paddingHorizontal: 20, paddingBottom: 24, gap: 15 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalTitle: { color: palette.text, fontSize: 22, fontWeight: "700", marginTop: 4 },
  closeButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: palette.surfaceRaised, alignItems: "center", justifyContent: "center" },
  appList: { gap: 3, paddingBottom: 16 },
  appListRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.line },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", padding: 20 },
  pinCard: { backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1, borderRadius: 25, padding: 21, gap: 12 },
  pinInput: { color: palette.text, backgroundColor: "#080B09", borderWidth: 1, borderColor: palette.line, borderRadius: 14, height: 52, textAlign: "center", fontSize: 17, letterSpacing: 5 },
  errorText: { color: palette.danger, fontSize: 12 },
});
