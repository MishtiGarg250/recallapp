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
        <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Icon sf="house.fill" /><NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label></NativeTabs.Trigger>
        <NativeTabs.Trigger name="folders"><NativeTabs.Trigger.Icon sf="folder.fill" /><NativeTabs.Trigger.Label>Folders</NativeTabs.Trigger.Label></NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings"><NativeTabs.Trigger.Icon sf="gearshape.fill" /><NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      </NativeTabs>
    );
  }
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.brandPrimary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { ...(Platform.OS === "web" ? { height: 64 } : {}) }, tabBarItemStyle: { alignSelf: "center" } }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <Feather name="home" size={21} color={color} /> }} />
      <Tabs.Screen name="folders" options={{ title: "Folders", tabBarIcon: ({ color }) => <Feather name="folder" size={21} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }) => <Feather name="settings" size={21} color={color} /> }} />
    </Tabs>
  );
}