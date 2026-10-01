import { Feather } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Image, Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MarkdownText } from "@/src/components/MarkdownText";
import { useLinks } from "@/src/links/LinksContext";
import type { ChecklistItem } from "@/src/links/storage";
import { makeStyles, useTheme } from "@/src/theme";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { items, folders, updateItem, removeItem } = useLinks();
  const item = items.find((entry) => entry.id === id);
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [labelsText, setLabelsText] = useState(item?.labels.join(", ") ?? "");
  const player = useAudioPlayer(item?.voiceUri ? { uri: item.voiceUri } : null);

  const folder = useMemo(() => folders.find((entry) => entry.id === item?.folderId), [folders, item]);

  if (!item) {
    return (
      <View style={styles.screen}>
        <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
          <Text style={styles.title}>Item not found</Text>
          <Pressable testID="go-back" onPress={() => router.back()} style={styles.saveButton}>
            <Text style={styles.saveText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  async function save() {
    const labels = labelsText.split(",").map((label) => label.trim().replace(/^#/, "")).filter(Boolean);
    await updateItem(item!.id, { notes, labels });
  }

  function remove() {
    Alert.alert("Delete this item?", "It will be removed from your archive.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await removeItem(item!.id); router.back(); } },
    ]);
  }

  async function togglePin() { await updateItem(item!.id, { pinned: !item!.pinned }); }
  async function toggleArchive() { await updateItem(item!.id, { archived: !item!.archived }); router.back(); }

  async function toggleChecklist(entry: ChecklistItem) {
    const next = (item!.checklist ?? []).map((c) => c.id === entry.id ? { ...c, done: !c.done } : c);
    await updateItem(item!.id, { checklist: next });
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        <View style={[styles.topbar, { paddingTop: insets.top + 12 }]}>
          <Pressable testID="detail-back" onPress={() => router.back()} style={styles.iconButton}>
            <Feather name="arrow-left" size={21} color={colors.onSurface} />
          </Pressable>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable testID="detail-pin" onPress={() => void togglePin()} style={styles.iconButton}>
              <Feather name="star" size={19} color={item.pinned ? colors.brandPrimary : colors.muted} />
            </Pressable>
            <Pressable testID="detail-archive" onPress={() => void toggleArchive()} style={styles.iconButton}>
              <Feather name={item.archived ? "corner-up-left" : "archive"} size={19} color={colors.onSurface} />
            </Pressable>
          </View>
        </View>

        {item.type === "link" && item.previewImage ? (
          <View style={styles.hero}>
            <Image source={{ uri: item.previewImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          </View>
        ) : null}

        {item.type === "image" && item.imageUri ? (
          <View style={styles.hero}>
            <Image source={{ uri: item.imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          </View>
        ) : null}

        <View style={styles.body}>
          <Text style={styles.kind}>{item.domain ?? item.type.toUpperCase()}</Text>
          <Text style={styles.title}>{item.title}</Text>
          {item.body ? (
            item.type === "note" || item.type === "snippet" ? (
              <View style={{ marginTop: 14 }}><MarkdownText source={item.body} /></View>
            ) : (
              <Text style={styles.description}>{item.body}</Text>
            )
          ) : null}

          {item.type === "checklist" && item.checklist ? (
            <View style={{ marginTop: 20 }}>
              {item.checklist.map((entry) => (
                <Pressable key={entry.id} testID={`checklist-toggle-${entry.id}`} onPress={() => void toggleChecklist(entry)} style={styles.checkRow}>
                  <Feather name={entry.done ? "check-circle" : "circle"} size={20} color={entry.done ? colors.brandPrimary : colors.muted} />
                  <Text style={[styles.checkText, entry.done && styles.checkDone]}>{entry.text}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {item.type === "snippet" && item.voiceUri ? (
            <Pressable
              testID="voice-play"
              onPress={() => { if (player.playing) player.pause(); else { player.seekTo(0); player.play(); } }}
              style={styles.voicePlay}
            >
              <Feather name={player.playing ? "pause" : "play"} size={21} color={colors.onBrandPrimary} />
              <Text style={styles.voicePlayText}>{player.playing ? "Playing voice snippet…" : "Play voice snippet"}</Text>
            </Pressable>
          ) : null}

          <View style={styles.metaRow}>
            {folder ? (
              <View style={styles.pill}>
                <View style={[styles.dot, { backgroundColor: folder.color }]} />
                <Text style={styles.pillText}>{folder.name}</Text>
              </View>
            ) : null}
            {item.labels.map((label) => (<Text key={label} style={styles.tag}>#{label}</Text>))}
          </View>

          <Text style={styles.section}>NOTES</Text>
          <TextInput testID="detail-notes" value={notes} onChangeText={setNotes} placeholder="Add a note for future you…" placeholderTextColor={colors.muted} multiline style={styles.notes} />

          <Text style={styles.section}>LABELS</Text>
          <TextInput testID="detail-labels" value={labelsText} onChangeText={setLabelsText} placeholder="design, read-later" placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" />

          <Pressable testID="detail-save" onPress={() => void save()} style={styles.saveButton}>
            <Text style={styles.saveText}>Save changes</Text>
          </Pressable>

          <Pressable testID="detail-delete" onPress={remove} style={styles.delete}>
            <Feather name="trash-2" size={16} color={colors.error} />
            <Text style={styles.deleteText}>Delete item</Text>
          </Pressable>
        </View>
      </ScrollView>

      {item.type === "link" && item.url ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable testID="link-open" onPress={() => void Linking.openURL(item.url!)} style={styles.bottomAction}>
            <Feather name="external-link" size={18} color={colors.onBrandPrimary} />
            <Text style={styles.bottomText}>Open</Text>
          </Pressable>
          <Pressable testID="link-share" onPress={() => void Share.share({ message: item.url!, title: item.title })} style={[styles.bottomAction, styles.shareAction]}>
            <Feather name="share-2" size={18} color={colors.brandPrimary} />
            <Text style={styles.shareText}>Share</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary },
  hero: { height: 220, overflow: "hidden", backgroundColor: colors.brandTertiary, marginTop: 14 },
  body: { padding: 20 },
  kind: { color: colors.brandPrimary, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.1, fontWeight: "800" },
  title: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 29, lineHeight: 35, fontWeight: "500", marginTop: 9 },
  description: { color: colors.onSurfaceSecondary, fontSize: 15, lineHeight: 22, marginTop: 12 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 11, minHeight: 46, borderBottomWidth: 1, borderBottomColor: colors.divider },
  checkText: { color: colors.onSurface, fontSize: 15, flex: 1 },
  checkDone: { color: colors.muted, textDecorationLine: "line-through" },
  voicePlay: { marginTop: 18, minHeight: 54, borderRadius: 27, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 },
  voicePlayText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "700" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 17 },
  pill: { minHeight: 30, borderRadius: 16, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700" },
  tag: { color: colors.brandPrimary, fontSize: 13, fontWeight: "700" },
  section: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginTop: 26, marginBottom: 9 },
  notes: { minHeight: 105, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.surfaceSecondary, color: colors.onSurface, padding: 14, fontSize: 15, textAlignVertical: "top" },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.surfaceSecondary, color: colors.onSurface, paddingHorizontal: 14, fontSize: 15 },
  saveButton: { minHeight: 48, borderRadius: 24, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginTop: 20 },
  saveText: { color: colors.onBrandPrimary, fontWeight: "800" },
  delete: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 7 },
  deleteText: { color: colors.error, fontWeight: "700", fontSize: 13 },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider, paddingHorizontal: 20, paddingTop: 12, flexDirection: "row", gap: 10 },
  bottomAction: { flex: 1, minHeight: 46, borderRadius: 23, backgroundColor: colors.brandPrimary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  bottomText: { color: colors.onBrandPrimary, fontWeight: "800" },
  shareAction: { backgroundColor: colors.brandTertiary },
  shareText: { color: colors.brandPrimary, fontWeight: "800" },
}));
