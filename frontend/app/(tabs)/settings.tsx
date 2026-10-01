import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RecallLogo } from "@/src/components/RecallLogo";
import { useLinks } from "@/src/links/LinksContext";
import { requestNotificationPermissions } from "@/src/links/notifications";
import { clearAllData, exportData } from "@/src/links/storage";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { items, folders, reminders, refresh } = useLinks();
  const [busy, setBusy] = useState(false);
  const [notifStatus, setNotifStatus] = useState<"idle" | "granted" | "denied">("idle");

  async function backup() {
    setBusy(true);
    try {
      await Share.share({ message: await exportData(), title: "Recall backup" });
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    Alert.alert("Clear everything?", "This removes every saved item, folder, and reminder from this device.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => { await clearAllData(); await refresh(); } },
    ]);
  }

  async function enableNotifs() {
    const ok = await requestNotificationPermissions();
    setNotifStatus(ok ? "granted" : "denied");
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: 24 + (usesNativeTabs ? insets.bottom : 0) }]}>
        <Text style={styles.eyebrow}>YOUR SPACE</Text>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Quiet controls for your private archive.</Text>

        <Text style={styles.section}>STORAGE & PRIVACY</Text>
        <View style={styles.panel}>
          <Row icon="shield" title="On-device only" detail="Your Recall never leaves this phone." colors={colors} />
          <View style={styles.divider} />
          <Row icon="database" title={`${items.length} saved ${items.length === 1 ? "item" : "items"}`} detail={`${folders.length} ${folders.length === 1 ? "folder" : "folders"} · ${reminders.length} ${reminders.length === 1 ? "reminder" : "reminders"}`} colors={colors} />
        </View>

        <Text style={styles.section}>NOTIFICATIONS</Text>
        <View style={styles.panel}>
          <Pressable testID="enable-notifs" onPress={() => void enableNotifs()} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
            <View style={styles.actionIcon}><Feather name="bell" size={18} color={colors.brandPrimary} /></View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>{notifStatus === "granted" ? "Notifications enabled" : notifStatus === "denied" ? "Permission denied" : "Allow local reminders"}</Text>
              <Text style={styles.actionDetail}>{notifStatus === "denied" ? "Open system settings to allow" : "On-device alerts only"}</Text>
            </View>
            <Feather name="chevron-right" size={19} color={colors.muted} />
          </Pressable>
          <View style={styles.divider} />
          <View style={styles.actionRow}>
            <View style={styles.actionIcon}><Feather name="info" size={18} color={colors.brandPrimary} /></View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Expo Go note</Text>
              <Text style={styles.actionDetail}>Local reminders work. Remote push isn’t used — safe to ignore any Expo Go warning about it.</Text>
            </View>
          </View>
        </View>

        <Text style={styles.section}>BACKUP & RESTORE</Text>
        <View style={styles.panel}>
          <Pressable testID="export-button" disabled={busy} onPress={() => void backup()} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
            <View style={styles.actionIcon}><Feather name="download" size={18} color={colors.brandPrimary} /></View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>{busy ? "Preparing backup…" : "Export archive"}</Text>
              <Text style={styles.actionDetail}>Share a portable JSON copy</Text>
            </View>
            <Feather name="chevron-right" size={19} color={colors.muted} />
          </Pressable>
        </View>

        <Text style={styles.section}>DANGER ZONE</Text>
        <View style={styles.panel}>
          <Pressable testID="clear-button" onPress={clear} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
            <View style={[styles.actionIcon, { backgroundColor: colors.surfaceTertiary }]}>
              <Feather name="trash-2" size={18} color={colors.error} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={[styles.actionTitle, { color: colors.error }]}>Clear local archive</Text>
              <Text style={styles.actionDetail}>Remove every item, folder, reminder</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.about}>
          <RecallLogo size={46} />
          <Text style={styles.aboutTitle}>Recall</Text>
          <Text style={styles.aboutText}>A calm place for the things worth finding again.</Text>
          <Text style={styles.version}>Version 1.0 · Private by design</Text>
        </View>
      </View>
    </View>
  );
}

function Row({ icon, title, detail, colors }: { icon: keyof typeof Feather.glyphMap; title: string; detail: string; colors: ReturnType<typeof useTheme>["colors"] }) {
  return (
    <View style={stylesStatic.actionRow}>
      <View style={[stylesStatic.actionIcon, { backgroundColor: colors.brandTertiary }]}>
        <Feather name={icon} size={18} color={colors.brandPrimary} />
      </View>
      <View style={stylesStatic.actionCopy}>
        <Text style={[stylesStatic.actionTitle, { color: colors.onSurface }]}>{title}</Text>
        <Text style={[stylesStatic.actionDetail, { color: colors.muted }]}>{detail}</Text>
      </View>
    </View>
  );
}

const stylesStatic = StyleSheet.create({
  actionRow: { flexDirection: "row", alignItems: "center", minHeight: 66, gap: 12 },
  actionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionCopy: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: "700" },
  actionDetail: { fontSize: 13, marginTop: 4 },
});

const useStyles = makeStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, paddingHorizontal: 20 },
  eyebrow: { color: colors.brandPrimary, fontSize: 11, letterSpacing: 1.4, fontWeight: "700" },
  title: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 34, fontWeight: "500", marginTop: 4 },
  subtitle: { color: colors.onSurfaceSecondary, fontSize: 16, marginTop: 7, marginBottom: 20 },
  section: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginBottom: 9, marginTop: 16 },
  panel: { backgroundColor: colors.surfaceSecondary, borderRadius: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: colors.border },
  divider: { height: 1, backgroundColor: colors.divider },
  actionRow: { flexDirection: "row", alignItems: "center", minHeight: 66, gap: 12 },
  actionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  actionCopy: { flex: 1 },
  actionTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  actionDetail: { color: colors.muted, fontSize: 13, marginTop: 4 },
  pressed: { opacity: 0.65 },
  about: { alignItems: "center", marginTop: 32, gap: 7 },
  aboutTitle: { color: colors.brandPrimary, fontFamily: "Georgia", fontWeight: "500", fontSize: 22, marginTop: 10 },
  aboutText: { color: colors.onSurfaceSecondary, fontSize: 13 },
  version: { color: colors.muted, fontSize: 12, marginTop: 6 },
}));
