import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, Share, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RecallLogo } from "@/src/components/RecallLogo";
import { useOnboarding } from "@/app/_layout";
import { useLinks } from "@/src/links/LinksContext";
import { requestNotificationPermissions } from "@/src/links/notifications";
import { clearAllData, exportData, exportMarkdown, getDefaultShareFolderId, setDefaultShareFolderId } from "@/src/links/storage";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { items, folders, reminders, refresh } = useLinks();
  const { setOnboarded } = useOnboarding();
  const [busy, setBusy] = useState<null | "json" | "md">(null);
  const [notifStatus, setNotifStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [shareFolderId, setShareFolderId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => { void getDefaultShareFolderId().then(setShareFolderId); }, []);

  async function backup() {
    setBusy("json");
    try {
      await Share.share({ message: await exportData(), title: "Recall backup" });
    } catch {
      // Share may be unavailable (e.g. web preview); no-op.
    } finally {
      setBusy(null);
    }
  }

  async function backupMarkdown() {
    setBusy("md");
    try {
      await Share.share({ message: await exportMarkdown(), title: "Recall markdown export" });
    } catch {
      // Share may be unavailable (e.g. web preview); no-op.
    } finally {
      setBusy(null);
    }
  }

  function clear() {
    Alert.alert("Clear everything?", "This removes every saved item, folder, and reminder from this device.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => { await clearAllData(); setShareFolderId(null); await refresh(); } },
    ]);
  }

  async function enableNotifs() {
    const ok = await requestNotificationPermissions();
    setNotifStatus(ok ? "granted" : "denied");
  }

  async function chooseShareFolder(id: string | null) {
    setShareFolderId(id);
    await setDefaultShareFolderId(id);
    setPickerOpen(false);
  }

  const shareFolderName = shareFolderId ? (folders.find((f) => f.id === shareFolderId)?.name ?? "Inbox") : "Inbox (default)";

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

        <Text style={styles.section}>SHARESHEET</Text>
        <View style={styles.panel}>
          <Pressable testID="share-folder-picker" onPress={() => setPickerOpen(true)} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
            <View style={styles.actionIcon}><Feather name="share-2" size={18} color={colors.brandPrimary} /></View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Default folder for shared links</Text>
              <Text style={styles.actionDetail} numberOfLines={1}>{shareFolderName}</Text>
            </View>
            <Feather name="chevron-right" size={19} color={colors.muted} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            testID="replay-onboarding"
            onPress={async () => {
              await AsyncStorage.removeItem("recall.onboarded.v1");
              setOnboarded(false);
              router.replace("/onboarding");
            }}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <View style={styles.actionIcon}><Feather name="refresh-cw" size={18} color={colors.brandPrimary} /></View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Replay the welcome tour</Text>
              <Text style={styles.actionDetail}>See the four intro slides again</Text>
            </View>
            <Feather name="chevron-right" size={19} color={colors.muted} />
          </Pressable>
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
          <Pressable testID="export-json-button" disabled={busy !== null} onPress={() => void backup()} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
            <View style={styles.actionIcon}><Feather name="download" size={18} color={colors.brandPrimary} /></View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>{busy === "json" ? "Preparing backup…" : "Export as JSON"}</Text>
              <Text style={styles.actionDetail}>Portable, machine-readable copy</Text>
            </View>
            <Feather name="chevron-right" size={19} color={colors.muted} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable testID="export-md-button" disabled={busy !== null} onPress={() => void backupMarkdown()} style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
            <View style={styles.actionIcon}><Feather name="file-text" size={18} color={colors.brandPrimary} /></View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>{busy === "md" ? "Preparing Markdown…" : "Export as Markdown"}</Text>
              <Text style={styles.actionDetail}>Readable in Obsidian, Bear, Notion</Text>
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

      <Modal transparent animationType="fade" visible={pickerOpen} onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={[styles.modal, { paddingBottom: insets.bottom + 22 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Where should shared links land?</Text>
            <Text style={styles.modalBody}>Pick a default folder for links coming from the Android Sharesheet.</Text>

            <Pressable testID="share-folder-option-inbox" onPress={() => void chooseShareFolder(null)} style={styles.folderOption}>
              <Feather name="inbox" size={18} color={shareFolderId === null ? colors.brandPrimary : colors.muted} />
              <Text style={[styles.folderOptionText, shareFolderId === null && styles.folderOptionTextActive]}>Inbox (no folder)</Text>
              {shareFolderId === null ? <Feather name="check" size={18} color={colors.brandPrimary} /> : null}
            </Pressable>

            {folders.map((folder) => {
              const active = shareFolderId === folder.id;
              return (
                <Pressable key={folder.id} testID={`share-folder-option-${folder.id}`} onPress={() => void chooseShareFolder(folder.id)} style={styles.folderOption}>
                  <View style={[styles.folderDot, { backgroundColor: folder.color }]} />
                  <Text style={[styles.folderOptionText, active && styles.folderOptionTextActive]}>{folder.name}</Text>
                  {active ? <Feather name="check" size={18} color={colors.brandPrimary} /> : null}
                </Pressable>
              );
            })}

            {folders.length === 0 ? (
              <Text style={styles.noFolders}>Create folders in the Archive tab to assign a default here.</Text>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
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
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(28,26,25,0.35)" },
  modal: { backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 12, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: 20 },
  modalTitle: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 22, fontWeight: "500" },
  modalBody: { color: colors.muted, fontSize: 13, marginTop: 6, marginBottom: 16 },
  folderOption: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.surfaceSecondary, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  folderOptionText: { flex: 1, color: colors.onSurface, fontSize: 15, fontWeight: "600" },
  folderOptionTextActive: { color: colors.brandPrimary, fontWeight: "800" },
  folderDot: { width: 12, height: 12, borderRadius: 6 },
  noFolders: { color: colors.muted, fontSize: 13, textAlign: "center", paddingVertical: 10 },
}));
