import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLinks } from "@/src/links/LinksContext";
import type { RecallItem } from "@/src/links/storage";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

type Scope = "all" | "pinned" | "archived";

export default function ArchiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { items, folders, addFolder, removeFolder } = useLinks();

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [folderId, setFolderId] = useState<string | undefined>();
  const [folderModal, setFolderModal] = useState(false);
  const [newFolder, setNewFolder] = useState("");

  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (scope === "pinned") { if (!item.pinned || item.archived) return false; }
      else if (scope === "archived") { if (!item.archived) return false; }
      else if (item.archived) return false;
      if (folderId && item.folderId !== folderId) return false;
      if (!q) return true;
      return `${item.title} ${item.body} ${item.domain ?? ""} ${item.labels.join(" ")}`.toLowerCase().includes(q);
    });
  }, [items, query, scope, folderId]);

  async function createFolder() {
    if (!newFolder.trim()) return;
    await addFolder(newFolder);
    setNewFolder("");
    setFolderModal(false);
  }

  function askRemoveFolder(id: string, name: string) {
    Alert.alert(`Delete "${name}"?`, "Items stay saved, just move out of this folder.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void removeFolder(id) },
    ]);
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={matching}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: 30 + (usesNativeTabs ? insets.bottom : 0), paddingHorizontal: 20 }}
        renderItem={({ item }) => <ArchiveCard item={item} onPress={() => router.push({ pathname: "/item/[id]", params: { id: item.id } })} styles={styles} colors={colors} />}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>ARCHIVE & SEARCH</Text>
                <Text style={styles.title}>Everything saved</Text>
              </View>
              <Pressable testID="new-folder-button" onPress={() => setFolderModal(true)} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                <Feather name="folder-plus" size={18} color={colors.onBrandPrimary} />
                <Text style={styles.addText}>Folder</Text>
              </Pressable>
            </View>
            <View style={styles.searchBox}>
              <Feather name="search" size={18} color={colors.muted} />
              <TextInput testID="archive-search" value={query} onChangeText={setQuery} placeholder="Search title, note, label, domain" placeholderTextColor={colors.muted} style={styles.searchInput} />
            </View>

            <View style={styles.scopeRow}>
              {([
                { key: "all", label: "All" },
                { key: "pinned", label: "Pinned" },
                { key: "archived", label: "Archived" },
              ] as const).map((entry) => {
                const active = scope === entry.key;
                return (
                  <Pressable key={entry.key} testID={`scope-${entry.key}`} onPress={() => setScope(entry.key)} style={[styles.scopeChip, active && styles.scopeChipActive]}>
                    <Text style={[styles.scopeText, active && styles.scopeTextActive]}>{entry.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>FOLDERS</Text>
            {folders.length === 0 ? (
              <Text style={styles.noFolders}>No folders yet. Tap “Folder” to add one.</Text>
            ) : (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[{ id: "__all__", name: "All items", color: colors.brandPrimary }, ...folders]}
                keyExtractor={(f) => f.id}
                contentContainerStyle={styles.folderRow}
                renderItem={({ item }) => {
                  const active = item.id === "__all__" ? !folderId : folderId === item.id;
                  const count = item.id === "__all__" ? items.filter((i) => !i.archived).length : items.filter((i) => i.folderId === item.id && !i.archived).length;
                  return (
                    <Pressable
                      testID={`folder-chip-${item.id}`}
                      onPress={() => setFolderId(item.id === "__all__" ? undefined : item.id)}
                      onLongPress={() => item.id !== "__all__" ? askRemoveFolder(item.id, item.name) : undefined}
                      style={[styles.folderCard, active && styles.folderCardActive]}
                    >
                      <View style={[styles.folderDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.folderName, active && styles.folderNameActive]} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.folderCount}>{count}</Text>
                    </Pressable>
                  );
                }}
              />
            )}

            <Text style={styles.sectionLabel}>{matching.length} {matching.length === 1 ? "ITEM" : "ITEMS"}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Feather name="archive" size={27} color={colors.brandPrimary} /></View>
            <Text style={styles.emptyTitle}>{query ? "Nothing matches" : scope === "archived" ? "Archive is empty" : "Save your first thing"}</Text>
            <Text style={styles.emptyBody}>{query ? "Try another word, label, or domain." : "Capture a link, note, image, or voice snippet to see it here."}</Text>
          </View>
        }
      />

      <Modal transparent animationType="fade" visible={folderModal} onRequestClose={() => setFolderModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { paddingBottom: insets.bottom + 22 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New folder</Text>
            <Text style={styles.modalBody}>A simple name is enough.</Text>
            <TextInput testID="new-folder-input" autoFocus value={newFolder} onChangeText={setNewFolder} placeholder="e.g. Read later" placeholderTextColor={colors.muted} style={styles.modalInput} onSubmitEditing={() => void createFolder()} />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setFolderModal(false)} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
              <Pressable testID="create-folder-button" onPress={() => void createFolder()} style={styles.create}><Text style={styles.createText}>Create folder</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ArchiveCard({ item, onPress, styles, colors }: { item: RecallItem; onPress: () => void; styles: ReturnType<typeof useStyles>; colors: ReturnType<typeof useTheme>["colors"] }) {
  const icon = item.type === "link" ? "link" : item.type === "note" ? "file-text" : item.type === "checklist" ? "check-square" : item.type === "image" ? "image" : "message-circle";
  return (
    <Pressable testID={`archive-card-${item.id}`} onPress={onPress} style={({ pressed }) => [styles.itemCard, pressed && styles.pressed]}>
      <View style={styles.itemTop}>
        <View style={styles.itemIcon}><Feather name={icon} size={14} color={colors.brandPrimary} /></View>
        <Text style={styles.itemKind}>{item.domain ?? item.type}</Text>
        {item.pinned ? <Feather name="star" size={14} color={colors.brandPrimary} /> : null}
      </View>
      <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
      {item.body ? <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text> : null}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 15 },
  eyebrow: { color: colors.brandPrimary, fontSize: 10, letterSpacing: 1.3, fontWeight: "700" },
  title: { color: colors.onSurface, fontSize: 29, fontFamily: "Georgia", fontWeight: "500", marginTop: 4 },
  addButton: { minHeight: 42, paddingHorizontal: 13, borderRadius: 21, backgroundColor: colors.brandPrimary, flexDirection: "row", alignItems: "center", gap: 6 },
  addText: { color: colors.onBrandPrimary, fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  searchBox: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 9 },
  searchInput: { flex: 1, color: colors.onSurface, fontSize: 15 },
  scopeRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  scopeChip: { flexShrink: 0, minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, justifyContent: "center" },
  scopeChipActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  scopeText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700" },
  scopeTextActive: { color: colors.onBrandTertiary },
  sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginTop: 22, marginBottom: 10 },
  noFolders: { color: colors.muted, fontSize: 13 },
  folderRow: { gap: 10, paddingBottom: 4 },
  folderCard: { minWidth: 120, minHeight: 72, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, padding: 11, justifyContent: "space-between" },
  folderCardActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  folderDot: { width: 10, height: 10, borderRadius: 5 },
  folderName: { color: colors.onSurface, fontSize: 13, fontWeight: "700" },
  folderNameActive: { color: colors.onBrandTertiary },
  folderCount: { color: colors.muted, fontSize: 11 },
  itemCard: { borderRadius: 15, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, padding: 15, marginBottom: 10 },
  itemTop: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 9 },
  itemIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  itemKind: { flex: 1, color: colors.brandPrimary, textTransform: "uppercase", letterSpacing: 0.7, fontSize: 10, fontWeight: "700" },
  itemTitle: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 17, lineHeight: 22, fontWeight: "500" },
  itemBody: { color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 },
  empty: { alignItems: "center", paddingTop: 56, paddingHorizontal: 28 },
  emptyIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 20, fontWeight: "500", textAlign: "center" },
  emptyBody: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 9 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(28,26,25,0.35)" },
  modal: { backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 12, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, marginBottom: 24 },
  modalTitle: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 24, fontWeight: "500" },
  modalBody: { color: colors.muted, fontSize: 14, marginTop: 6, marginBottom: 18 },
  modalInput: { minHeight: 52, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 13, paddingHorizontal: 14, color: colors.onSurface, backgroundColor: colors.surfaceSecondary, fontSize: 15 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  cancel: { flex: 1, minHeight: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceTertiary },
  cancelText: { color: colors.onSurfaceSecondary, fontWeight: "700" },
  create: { flex: 1.5, minHeight: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandPrimary },
  createText: { color: colors.onBrandPrimary, fontWeight: "700" },
}));
