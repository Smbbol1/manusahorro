import type { ReactNode } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type PressableProps, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const palette = {
  background: "#050706",
  oled: "#000000",
  surface: "#101512",
  surfaceRaised: "#151D17",
  line: "#26312A",
  text: "#F3F6F2",
  muted: "#99A69D",
  dim: "#68746C",
  lime: "#B8F36A",
  limeDeep: "#26391C",
  amber: "#F2B95F",
  danger: "#FF9188",
};

export function AppPage({ children, scroll = true, style, backgroundImageUri }: { children: ReactNode; scroll?: boolean; style?: ViewStyle; backgroundImageUri?: string | null }) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.page, style]}>
      {backgroundImageUri ? <Image source={{ uri: backgroundImageUri }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : null}
      {backgroundImageUri ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wallpaperShade]} /> : null}
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.headingWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

type ButtonProps = PressableProps & {
  label: string;
  tone?: "primary" | "quiet" | "outline" | "danger";
  compact?: boolean;
};

export function AppButton({ label, tone = "primary", compact = false, style, ...props }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        tone === "primary" && styles.buttonPrimary,
        tone === "quiet" && styles.buttonQuiet,
        tone === "outline" && styles.buttonOutline,
        tone === "danger" && styles.buttonDanger,
        pressed && styles.buttonPressed,
        style as ViewStyle,
      ]}
      {...props}
    >
      <Text style={[styles.buttonLabel, tone === "primary" && styles.primaryLabel, tone === "danger" && styles.dangerLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export const textStyles = StyleSheet.create({
  title: { color: palette.text, fontSize: 32, lineHeight: 38, fontWeight: "700", letterSpacing: -0.7 },
  body: { color: palette.muted, fontSize: 14, lineHeight: 21 },
  label: { color: palette.text, fontSize: 15, fontWeight: "600" },
});

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.background, position: "relative" },
  wallpaperShade: { backgroundColor: "rgba(3,8,5,0.72)" },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, gap: 18 },
  card: { backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1, borderRadius: 22, padding: 18, gap: 14 },
  eyebrow: { color: palette.lime, fontSize: 11, fontWeight: "800", letterSpacing: 1.6, textTransform: "uppercase" },
  headingWrap: { gap: 5, marginTop: 4 },
  sectionTitle: { color: palette.text, fontSize: 21, fontWeight: "700", letterSpacing: -0.3 },
  subtitle: { color: palette.muted, fontSize: 13, lineHeight: 19 },
  button: { minHeight: 50, paddingHorizontal: 18, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  buttonCompact: { minHeight: 42, paddingHorizontal: 14, borderRadius: 13 },
  buttonPrimary: { backgroundColor: palette.lime },
  buttonQuiet: { backgroundColor: palette.surfaceRaised },
  buttonOutline: { backgroundColor: "transparent", borderWidth: 1, borderColor: palette.line },
  buttonDanger: { backgroundColor: "#2B1716", borderWidth: 1, borderColor: "#58302D" },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  buttonLabel: { color: palette.text, fontSize: 14, fontWeight: "700" },
  primaryLabel: { color: "#17220F" },
  dangerLabel: { color: palette.danger },
  divider: { height: 1, backgroundColor: palette.line },
});
