import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboarding } from "@/app/_layout";
import { RecallLogo } from "@/src/components/RecallLogo";
import { useLinks } from "@/src/links/LinksContext";
import { requestNotificationPermissions } from "@/src/links/notifications";
import { clearAllData, exportData, exportMarkdown, getDefaultShareFolderId, setDefaultShareFolderId } from "@/src/links/storage";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme, type ThemeColors } from "@/src/theme";

type RowProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  detail?: string;
  onPress?: () => void;
  destructive?: boolean;
  trailing?: React.ReactNode;
  testID?: string;
  disabled?: boolean;
  first?: boolean;
  last?: boolean;
};

function SettingsRow({ icon, title, detail, onPress, destructive, trailing, testID, disabled, first, last }: RowProps) {
  const { colors } = useTheme();
  const Content = (
    <View style={rowStyles.container}>
      <View style={[rowStyles.icon, { backgroundColor: destructive ? "#FAE5E0" : colors.brandTertiary }]}>
        <Feather name={icon} size={17} color={destructive ? colors.error : colors.brandPrimary} />
      </View>
      <View style={rowStyles.textWrap}>
        <Text style={[rowStyles.title, { color: destructive ? colors.error : colors.onSurface }]} numberOfLines={1}>{title}</Text>
        {detail ? <Text style={[rowStyles.detail, { color: colors.muted }]} numberOfLines={2}>{detail}</Text> : null}
      </View>
      {trailing ?? (onPress ? <Feather name="chevron-right" size={18} color={colors.muted} /> : null)}
    </View>
  );
  const containerStyle = [
    { backgroundColor: colors.surface },
    first ? rowStyles.first : null,
    last ? rowStyles.last : null,
  ];
  if (!onPress) {
    return (
      <View testID={testID} style={containerStyle}>
        {Content}
        {!last ? <View style={[rowStyles.divider, { backgroundColor: colors.divider }]} /> : null}
      </View>
    );
  }
  return (
    <Pressable testID={testID} onPress={onPress} disabled={disabled} style={({ pressed }) => [containerStyle, pressed && { backgroundColor: colors.surfaceSecondary }]}>
      {Content}
      {!last ? <View style={[rowStyles.divider, { backgroundColor: colors.divider }]} /> : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { items, folders, reminders, refresh } = useLinks();
  const { setOnboarded } = useOnboarding();

  const [busy, setBusy] = useState<null | "json" | "md">(null);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [shareFolderId, setShareFolderId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => { void getDefaultShareFolderId().then(setShareFolderId); }, []);

  async function toggleNotifs(value: boolean) {
    if (!value) { setNotifEnabled(false); return; }
    const ok = await requestNotificationPermissions();
    setNotifEnabled(ok);
    if (!ok) Alert.alert("Permission needed", "Open your phone's Settings → Apps → Recall → Notifications to allow local reminders.");
  }

  async function backup() {
    setBusy("json");
    try { await Share.share({ message: await exportData(), title: "Recall backup" }); } catch { /* web */ } finally { setBusy(null); }
  }
  async function backupMarkdown() {
    setBusy("md");
    try { await Share.share({ message: await exportMarkdown(), title: "Recall markdown export" }); } catch { /* web */ } finally { setBusy(null); }
  }

  function clear() {
    Alert.alert("Clear everything?", "This permanently removes every saved item, folder, and reminder from this device.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => { await clearAllData(); setShareFolderId(null); await refresh(); } },
    ]);
  }

  async function replayOnboarding() {
    await AsyncStorage.removeItem("recall.onboarded.v1");
    setOnboarded(false);
    router.replace("/onboarding");
  }

  async function chooseShareFolder(id: string | null) {
    setShareFolderId(id);
    await setDefaultShareFolderId(id);
    setPickerOpen(false);
  }

  const shareFolderName = shareFolderId ? (folders.find((f) => f.id === shareFolderId)?.name ?? "Inbox") : "Inbox";

  return (
    <View style={styles.screen}>
      <ScrollView
        testID="settings-scroll"
        contentContainerStyle={{ paddingBottom: 40 + (usesNativeTabs ? insets.bottom : 0) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <View style={styles.heroLogoFrame}>
            <RecallLogo size={56} />
          </View>
          <Text style={styles.heroTitle}>Settings</Text>
          <Text style={styles.heroSubtitle}>Quiet controls for your private archive</Text>
          <View style={styles.statRow}>
            <Stat value={items.length} label={items.length === 1 ? "item" : "items"} colors={colors} />
            <View style={styles.statDivider} />
            <Stat value={folders.length} label={folders.length === 1 ? "folder" : "folders"} colors={colors} />
            <View style={styles.statDivider} />
            <Stat value={reminders.length} label={reminders.length === 1 ? "reminder" : "reminders"} colors={colors} />
          </View>
        </View>

        <SectionTitle label="Capture" colors={colors} />
        <View style={styles.card}>
          <SettingsRow
            icon="share-2"
            title="Default folder for shared links"
            detail={shareFolderName}
            onPress={() => setPickerOpen(true)}
            testID="share-folder-picker"
            first
            last
          />
        </View>

        <SectionTitle label="Notifications" colors={colors} />
        <View style={styles.card}>
          <SettingsRow
            icon="bell"
            title="Local reminders"
            detail={notifEnabled ? "Allowed on this device" : "Only your phone will alert you"}
            trailing={
              <Switch
                testID="notif-switch"
                value={notifEnabled}
                onValueChange={(value) => void toggleNotifs(value)}
                thumbColor={notifEnabled ? colors.brandPrimary : "#f4f3f4"}
                trackColor={{ false: "#d9d4cd", true: colors.brandTertiary }}
              />
            }
            first
          />
          <SettingsRow
            icon="info"
            title="Expo Go note"
            detail="Local reminders work. Remote push isn't used — ignore any Expo Go warning about it."
            last
          />
        </View>

        <SectionTitle label="Data & privacy" colors={colors} />
        <View style={styles.card}>
          <SettingsRow icon="shield" title="On-device only" detail="Recall never leaves this phone" first />
          <SettingsRow
            icon="download"
            title={busy === "json" ? "Preparing backup…" : "Export as JSON"}
            detail="Portable, machine-readable copy"
            onPress={() => void backup()}
            disabled={busy !== null}
            testID="export-json-button"
          />
          <SettingsRow
            icon="file-text"
            title={busy === "md" ? "Preparing Markdown…" : "Export as Markdown"}
            detail="Readable in Obsidian, Bear, Notion"
            onPress={() => void backupMarkdown()}
            disabled={busy !== null}
            testID="export-md-button"
            last
          />
        </View>

        <SectionTitle label="App" colors={colors} />
        <View style={styles.card}>
          <SettingsRow
            icon="refresh-cw"
            title="Replay the welcome tour"
            detail="See the four intro slides again"
            onPress={() => void replayOnboarding()}
            testID="replay-onboarding"
            first
          />
          <SettingsRow
            icon="help-circle"
            title="How Recall works"
            detail="A gentle tour of capture, folders, reminders"
            onPress={() => void replayOnboarding()}
            last
          />
        </View>

        <SectionTitle label="Danger zone" colors={colors} />
        <View style={styles.card}>
          <SettingsRow
            icon="trash-2"
            title="Clear local archive"
            detail="Remove every item, folder, and reminder"
            onPress={clear}
            destructive
            testID="clear-button"
            first
            last
          />
        </View>

        <View style={styles.footer}>
          <RecallLogo size={34} />
          <Text style={styles.footerTitle}>Recall</Text>
          <Text style={styles.footerBody}>Version 1.0.0 · Private by design</Text>
          <Text style={styles.footerSmall}>Made for the things worth finding again.</Text>
        </View>
      </ScrollView>

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

function SectionTitle({ label, colors }: { label: string; colors: ThemeColors }) {
  return <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.4, marginBottom: 10, marginTop: 24, paddingHorizontal: 20 }}>{label.toUpperCase()}</Text>;
}

function Stat({ value, label, colors }: { value: number; label: string; colors: ThemeColors }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ color: colors.onSurface, fontFamily: "Georgia", fontSize: 22, fontWeight: "500" }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 2, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 13, minHeight: 64, paddingVertical: 10, paddingHorizontal: 15 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  textWrap: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "600" },
  detail: { fontSize: 12.5, lineHeight: 17 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
  first: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  last: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
});

const useStyles = makeStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceSecondary },
  hero: { paddingHorizontal: 20, paddingBottom: 18, backgroundColor: colors.surface, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, alignItems: "center" },
  heroLogoFrame: { marginBottom: 12 },
  heroTitle: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 28, fontWeight: "500" },
  heroSubtitle: { color: colors.muted, fontSize: 13, marginTop: 4, marginBottom: 20 },
  statRow: { flexDirection: "row", width: "100%", backgroundColor: colors.surfaceSecondary, borderRadius: 16, paddingVertical: 14 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 6 },
  card: { marginHorizontal: 20, backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  footer: { alignItems: "center", gap: 6, paddingTop: 36, paddingBottom: 10 },
  footerTitle: { color: colors.brandPrimary, fontFamily: "Georgia", fontSize: 20, fontWeight: "500", marginTop: 8 },
  footerBody: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "600" },
  footerSmall: { color: colors.muted, fontSize: 11, marginTop: 4, fontStyle: "italic" },
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
