import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { usesNativeTabs } from "@/src/navigation";
import { useTheme } from "@/src/theme";

export default function TabLayout() {
  const { colors } = useTheme();
  if (usesNativeTabs) {
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Icon sf="tray.fill" /><NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label></NativeTabs.Trigger>
        <NativeTabs.Trigger name="archive"><NativeTabs.Trigger.Icon sf="archivebox.fill" /><NativeTabs.Trigger.Label>Archive</NativeTabs.Trigger.Label></NativeTabs.Trigger>
        <NativeTabs.Trigger name="reminders"><NativeTabs.Trigger.Icon sf="bell.fill" /><NativeTabs.Trigger.Label>Reminders</NativeTabs.Trigger.Label></NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings"><NativeTabs.Trigger.Icon sf="gearshape.fill" /><NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      </NativeTabs>
    );
  }
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.brandPrimary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { ...(Platform.OS === "web" ? { height: 64 } : {}) }, tabBarItemStyle: { alignSelf: "center" } }}>
      <Tabs.Screen name="index" options={{ title: "Inbox", tabBarIcon: ({ color }) => <Feather name="inbox" size={21} color={color} /> }} />
      <Tabs.Screen name="archive" options={{ title: "Archive", tabBarIcon: ({ color }) => <Feather name="archive" size={21} color={color} /> }} />
      <Tabs.Screen name="reminders" options={{ title: "Reminders", tabBarIcon: ({ color }) => <Feather name="bell" size={21} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }) => <Feather name="settings" size={21} color={color} /> }} />
    </Tabs>
  );
}