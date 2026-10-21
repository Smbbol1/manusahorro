import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import { useState } from "react";
import { Alert, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { UltraEcoAndroid } from "ultraeco-android";

import { AppButton, AppPage, Card, Eyebrow, palette, SectionHeading } from "@/components/ultraeco-ui";
import { getRecentAppErrors } from "@/lib/error-recorder";
import { useUltraEco } from "@/lib/ultraeco-store";

type ReportPart = { number: number; total: number; text: string };
const PART_LIMIT = 1700;

function redactSensitiveText(input: string) {
  return input
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTADO]")
    .replace(/\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]+/gi, "[CLAVE REDACTADA]")
    .replace(/((?:api[_-]?key|access[_-]?token|token|password|secret)\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s&,]+)/gi, "$1[REDACTADO]");
}

function splitReport(report: string): ReportPart[] {
  const characters = Array.from(report);
  const payloads: string[] = [];
  for (let index = 0; index < characters.length; index += PART_LIMIT) {
    payloads.push(characters.slice(index, index + PART_LIMIT).join(""));
  }
  const total = Math.max(payloads.length, 1);
  return payloads.map((payload, index) => ({
    number: index + 1,
    total,
    text: `ULTRAECO · SEGMENTO ${index + 1}/${total}\n${payload}`,
  }));
}

function notifyCopied(message: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(message);
  } else {
    Alert.alert("Copiado", message);
  }
}

export default function ReportScreen() {
  const { preferences } = useUltraEco();
  const [problem, setProblem] = useState("");
  const [parts, setParts] = useState<ReportPart[]>([]);
  const [copiedPart, setCopiedPart] = useState<number | null>(null);
  const [permissionSummary, setPermissionSummary] = useState<string | null>(null);

  const generateReport = async () => {
    const errors = getRecentAppErrors().slice(-8);
    let accessSummary = "No disponible fuera del APK Android.";
    if (UltraEcoAndroid) {
      try {
        const write = UltraEcoAndroid.canWriteSettings() ? "concedido" : "no concedido";
        const usage = UltraEcoAndroid.canAccessUsageStats() ? "concedido" : "no concedido";
        accessSummary = `WRITE_SETTINGS: ${write}; estadísticas de uso: ${usage}`;
      } catch {
        accessSummary = "No se pudo leer el estado actual de los accesos especiales.";
      }
    }
    setPermissionSummary(accessSummary);

    const lines = [
      "Reporte diagnóstico UltraEco",
      `Fecha: ${new Date().toISOString()}`,
      `Versión: ${Constants.expoConfig?.version ?? "desconocida"}`,
      `Plataforma: ${Platform.OS} ${Platform.Version}`,
      `Tema: ${preferences.theme}`,
      `Accesos elegidos: ${preferences.allowedApps.length}/10`,
      `Brillo modificado por UltraEco: ${preferences.savedBrightness !== null ? "sí" : "no"}`,
      `Accesos especiales: ${accessSummary}`,
      "",
      "Descripción escrita por el usuario:",
      redactSensitiveText(problem.trim() || "(sin descripción)"),
      "",
      "Errores recientes de esta sesión:",
      errors.length
        ? errors.map((entry) => `[${entry.time}] ${redactSensitiveText(entry.message)}`).join("\n\n")
        : "No se capturaron errores JavaScript. Si el problema es reproducible, describe los pasos arriba.",
      "",
      "Privacidad: este reporte se genera localmente. UltraEco no lo envía ni lo sube automáticamente.",
    ];
    setParts(splitReport(lines.join("\n")));
    setCopiedPart(null);
  };

  const copyPart = async (part: ReportPart) => {
    try {
      await Clipboard.setStringAsync(part.text);
      setCopiedPart(part.number);
      notifyCopied(`Segmento ${part.number}/${part.total} copiado. Pégalo en el chat y luego continúa con el siguiente.`);
    } catch {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(part.text);
        setCopiedPart(part.number);
        notifyCopied(`Segmento ${part.number}/${part.total} copiado.`);
      } else {
        Alert.alert("No se pudo copiar", "Selecciona y copia el texto del segmento manualmente.");
      }
    }
  };

  return (
    <AppPage>
      <View style={styles.header}>
        <Eyebrow>AYUDA Y DIAGNÓSTICO</Eyebrow>
        <Text style={styles.title}>Reporte de errores</Text>
        <Text style={styles.intro}>Genera un texto revisable y cópialo por partes para enviarlo por el chat. No se transmite nada desde la app.</Text>
      </View>

      <Card style={styles.privacyCard}>
        <View style={styles.privacyIcon}><Ionicons name="shield-checkmark-outline" size={20} color={palette.lime} /></View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.cardTitle}>Tú decides qué compartir</Text>
          <Text style={styles.cardCopy}>El informe incluye versión, plataforma, estado de permisos y errores recientes de esta sesión. Revisa cada segmento antes de copiarlo.</Text>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeading title="Describe lo que pasó" subtitle="Incluye pasos para reproducirlo y el resultado esperado." />
        <TextInput
          value={problem}
          onChangeText={setProblem}
          placeholder="Ej.: abrí Ajustes, elegí un fondo y la pantalla quedó en negro…"
          placeholderTextColor={palette.dim}
          multiline
          textAlignVertical="top"
          style={styles.problemInput}
          maxLength={4000}
          accessibilityLabel="Descripción del problema"
        />
        <AppButton label="Generar reporte local" onPress={() => void generateReport()} />
      </View>

      {parts.length > 0 ? (
        <View style={styles.section}>
          <SectionHeading title={`${parts.length} segmento${parts.length === 1 ? "" : "s"}`} subtitle="Copia cada uno por orden y pégalo en el chat antes de seguir con el siguiente." />
          {permissionSummary ? <Text style={styles.permissionSummary}>Accesos al generar: {permissionSummary}</Text> : null}
          {parts.map((part) => (
            <Card key={part.number} style={styles.partCard}>
              <View style={styles.partHeader}>
                <View style={styles.partBadge}><Text style={styles.partBadgeText}>{part.number}/{part.total}</Text></View>
                <Text style={styles.cardTitle}>Segmento {part.number}</Text>
                {copiedPart === part.number ? <Ionicons name="checkmark-circle" size={19} color={palette.lime} /> : null}
              </View>
              <Text selectable style={styles.partPreview}>{part.text}</Text>
              <AppButton compact label={copiedPart === part.number ? "Copiar de nuevo" : `Copiar segmento ${part.number}`} tone="quiet" onPress={() => void copyPart(part)} />
            </Card>
          ))}
          <Text style={styles.note}>Si el chat limita la longitud, envía cada segmento en mensajes separados y conserva el orden indicado.</Text>
        </View>
      ) : null}
    </AppPage>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8, marginBottom: 2 },
  title: { color: palette.text, fontSize: 32, lineHeight: 38, fontWeight: "700", letterSpacing: -0.8 },
  intro: { color: palette.muted, fontSize: 14, lineHeight: 21 },
  section: { gap: 12 },
  privacyCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: "#111A13" },
  privacyIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: palette.limeDeep, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: palette.text, fontSize: 14, fontWeight: "700" },
  cardCopy: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  problemInput: { minHeight: 140, backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1, borderRadius: 18, color: palette.text, padding: 15, fontSize: 14, lineHeight: 21 },
  permissionSummary: { color: palette.dim, fontSize: 11, lineHeight: 16 },
  partCard: { padding: 14, gap: 11 },
  partHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  partBadge: { backgroundColor: palette.limeDeep, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  partBadgeText: { color: palette.lime, fontSize: 10, fontWeight: "800" },
  partPreview: { color: palette.muted, fontSize: 11, lineHeight: 16, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  note: { color: palette.dim, fontSize: 11, lineHeight: 17 },
});
