import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { palette } from "@/components/ultraeco-ui";
import { useUltraEco } from "@/lib/ultraeco-store";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { preferences } = useUltraEco();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 58 + bottomPadding;
  const surfaceColor = preferences.theme === "oled" ? "#000000" : palette.background;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.lime,
        tabBarInactiveTintColor: palette.dim,
        headerShown: false,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: surfaceColor,
          borderTopColor: preferences.theme === "oled" ? "#111111" : palette.line,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => <Ionicons size={size} name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Ajustes",
          tabBarIcon: ({ color, size }) => <Ionicons size={size} name="options-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "Reporte",
          tabBarIcon: ({ color, size }) => <Ionicons size={size} name="document-text-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
