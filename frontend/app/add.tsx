import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLinks } from "@/src/links/LinksContext";
import { extractMetadata, normalizeUrl, type ExtractedMetadata } from "@/src/links/metadata";
import { getDefaultShareFolderId, type ChecklistItem, type ItemType } from "@/src/links/storage";
import { makeStyles, useTheme } from "@/src/theme";

const types: { key: ItemType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "link", label: "Link", icon: "link" },
  { key: "note", label: "Note", icon: "file-text" },
  { key: "checklist", label: "List", icon: "check-square" },
  { key: "image", label: "Image", icon: "image" },
  { key: "snippet", label: "Voice", icon: "mic" },
];

export default function AddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { folders, addItem } = useLinks();
  const params = useLocalSearchParams<{ url?: string; type?: ItemType }>();

  const [type, setType] = useState<ItemType>(params.type ?? (params.url ? "link" : "note"));
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState(params.url ?? "");
  const [metadata, setMetadata] = useState<ExtractedMetadata>();
  const [labelsText, setLabelsText] = useState("");
  const [folderId, setFolderId] = useState<string | undefined>();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([{ id: "1", text: "", done: false }]);
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [voiceUri, setVoiceUri] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const handleExtract = useCallback(async (value: string) => {
    setError("");
    try {
      const normalized = normalizeUrl(value);
      setUrl(normalized);
      setBusy(true);
      const data = await extractMetadata(normalized);
      setMetadata(data);
      if (!title) setTitle(data.title);
      if (!body) setBody(data.description);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that link.");
    } finally {
      setBusy(false);
    }
  }, [title, body]);

  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (bootstrappedRef.current || !params.url) return;
    bootstrappedRef.current = true;
    setType("link");
    setUrl(params.url);
    void handleExtract(params.url);
    // When launched from the Android Sharesheet, pre-select the user's default share folder.
    void getDefaultShareFolderId().then((defaultId) => { if (defaultId) setFolderId(defaultId); });
  }, [params.url, handleExtract]);

  async function pasteUrl() {
    const value = await Clipboard.getStringAsync();
    if (!value) return;
    setUrl(value);
    await handleExtract(value);
  }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Allow photo access to add an image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ["images"] });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  }

  async function toggleRecord() {
    if (recorderState.isRecording) {
      await recorder.stop();
      setVoiceUri(recorder.uri ?? undefined);
      return;
    }
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError("Allow microphone access to record a voice snippet.");
      return;
    }
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  function updateChecklistText(id: string, text: string) {
    setChecklist((prev) => prev.map((entry) => (entry.id === id ? { ...entry, text } : entry)));
  }
  function addChecklistItem() {
    setChecklist((prev) => [...prev, { id: `${Date.now()}`, text: "", done: false }]);
  }
  function removeChecklistItem(id: string) {
    setChecklist((prev) => (prev.length <= 1 ? prev : prev.filter((entry) => entry.id !== id)));
  }

  async function save() {
    setError("");
    const trimmedTitle = title.trim();
    const labels = labelsText.split(",").map((label) => label.trim().replace(/^#/, "")).filter(Boolean);

    try {
      if (type === "link") {
        if (!metadata && url.trim()) {
          await handleExtract(url);
          return;
        }
        const normalized = url.trim() ? normalizeUrl(url) : "";
        if (!normalized) throw new Error("Paste a link to continue.");
        await addItem({
          type: "link", title: trimmedTitle || metadata?.title || normalized, body: body.trim() || metadata?.description || "",
          url: normalized, domain: metadata?.domain, description: metadata?.description, previewImage: metadata?.previewImage,
          labels, folderId, notes: "", pinned: false, archived: false,
        });
      } else if (type === "note") {
        if (!trimmedTitle && !body.trim()) throw new Error("Write a title or a note.");
        await addItem({ type: "note", title: trimmedTitle || body.trim().slice(0, 40), body: body.trim(), labels, folderId, notes: "", pinned: false, archived: false });
      } else if (type === "checklist") {
        const filled = checklist.filter((entry) => entry.text.trim()).map((entry) => ({ ...entry, text: entry.text.trim() }));
        if (!filled.length) throw new Error("Add at least one checklist item.");
        await addItem({ type: "checklist", title: trimmedTitle || "Checklist", body: "", checklist: filled, labels, folderId, notes: "", pinned: false, archived: false });
      } else if (type === "image") {
        if (!imageUri) throw new Error("Pick an image to save.");
        await addItem({ type: "image", title: trimmedTitle || "Image", body: body.trim(), imageUri, labels, folderId, notes: "", pinned: false, archived: false });
      } else if (type === "snippet") {
        if (!voiceUri && !body.trim()) throw new Error("Record a snippet or type one.");
        await addItem({ type: "snippet", title: trimmedTitle || "Snippet", body: body.trim(), voiceUri, labels, folderId, notes: "", pinned: false, archived: false });
      }
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32, paddingHorizontal: 20 }}>
        <View style={styles.topbar}>
          <Pressable testID="composer-close" onPress={() => router.back()} style={styles.iconButton}>
            <Feather name="x" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.topTitle}>Capture</Text>
          <View style={{ width: 44 }} />
        </View>

        <Text style={styles.heading}>Something worth keeping.</Text>
        <Text style={styles.helper}>Save it on this device only. Add tags or a folder to find it later.</Text>

        <View style={styles.typeRow}>
          {types.map((entry) => {
            const active = type === entry.key;
            return (
              <Pressable key={entry.key} testID={`type-${entry.key}`} onPress={() => setType(entry.key)} style={[styles.typeChip, active && styles.typeChipActive]}>
                <Feather name={entry.icon} size={15} color={active ? colors.onBrandPrimary : colors.brandPrimary} />
                <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{entry.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {type === "link" ? (
          <View>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.label}>URL</Text>
              <Pressable onPress={pasteUrl} style={styles.pasteButton}>
                <Feather name="clipboard" size={14} color={colors.brandPrimary} />
                <Text style={styles.pasteText}>Paste</Text>
              </Pressable>
            </View>
            <View style={[styles.inputBox, error ? styles.inputError : null]}>
              <TextInput testID="url-input" value={url} onChangeText={(value) => { setUrl(value); setMetadata(undefined); }} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://example.com/article" placeholderTextColor={colors.muted} style={styles.textInput} />
            </View>
            <Pressable testID="extract-button" onPress={() => void handleExtract(url)} disabled={busy || !url.trim()} style={({ pressed }) => [styles.extractButton, (!url.trim() || busy) && styles.disabled, pressed && styles.pressed]}>
              {busy ? <ActivityIndicator color={colors.onBrandPrimary} /> : <><Feather name="search" size={16} color={colors.onBrandPrimary} /><Text style={styles.extractText}>Read page details</Text></>}
            </Pressable>
            {metadata ? (
              <View style={styles.preview}>
                <View style={styles.previewImage}>
                  {metadata.previewImage ? <Image source={{ uri: metadata.previewImage }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Feather name="file-text" size={25} color={colors.brandPrimary} />}
                </View>
                <View style={styles.previewContent}>
                  <Text style={styles.previewDomain}>{metadata.domain}</Text>
                  <Text style={styles.previewTitle} numberOfLines={3}>{metadata.title}</Text>
                  {metadata.description ? <Text style={styles.previewDescription} numberOfLines={2}>{metadata.description}</Text> : null}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {type === "note" || type === "snippet" || type === "image" ? (
          <View>
            <Text style={styles.label}>TITLE</Text>
            <TextInput testID="title-input" value={title} onChangeText={setTitle} placeholder={type === "note" ? "A quiet title" : type === "image" ? "Name this image" : "Name this snippet"} placeholderTextColor={colors.muted} style={[styles.textInput, styles.inputBox]} />
          </View>
        ) : null}

        {type === "note" || type === "snippet" ? (
          <View>
            <Text style={styles.label}>{type === "note" ? "NOTE" : "WHAT TO REMEMBER"}</Text>
            <TextInput testID="body-input" value={body} onChangeText={setBody} multiline placeholder={type === "note" ? "Write a thought you want to find again…" : "Add a line to go with the voice snippet…"} placeholderTextColor={colors.muted} style={[styles.textInput, styles.inputBox, styles.multiline]} />
            {type === "note" ? (
              <Text style={styles.markdownHint} testID="markdown-hint">Markdown works: **bold**  *italic*  # heading  - bullet</Text>
            ) : null}
          </View>
        ) : null}

        {type === "snippet" ? (
          <View style={styles.voiceBox}>
            <Pressable testID="voice-record" onPress={() => void toggleRecord()} style={[styles.voiceButton, recorderState.isRecording && styles.voiceRecording]}>
              <Feather name={recorderState.isRecording ? "square" : "mic"} size={21} color={colors.onBrandPrimary} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.voiceLabel}>{recorderState.isRecording ? "Recording…" : voiceUri ? "Snippet captured" : "Tap to record"}</Text>
              <Text style={styles.voiceHelper}>{recorderState.isRecording ? "Tap again to stop" : voiceUri ? "Saves with your note" : "Up to a minute works best"}</Text>
            </View>
          </View>
        ) : null}

        {type === "image" ? (
          <View>
            <Pressable testID="image-picker" onPress={() => void pickImage()} style={styles.imageDrop}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <>
                  <Feather name="image" size={28} color={colors.brandPrimary} />
                  <Text style={styles.imageDropText}>Pick an image from your library</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}

        {type === "checklist" ? (
          <View>
            <Text style={styles.label}>LIST TITLE</Text>
            <TextInput testID="title-input" value={title} onChangeText={setTitle} placeholder="e.g. Weekend errands" placeholderTextColor={colors.muted} style={[styles.textInput, styles.inputBox]} />
            <Text style={styles.label}>ITEMS</Text>
            {checklist.map((entry) => (
              <View key={entry.id} style={styles.checkRow}>
                <Feather name="circle" size={18} color={colors.muted} />
                <TextInput testID={`checklist-item-${entry.id}`} value={entry.text} onChangeText={(value) => updateChecklistText(entry.id, value)} placeholder="Add something" placeholderTextColor={colors.muted} style={styles.checkInput} />
                <Pressable onPress={() => removeChecklistItem(entry.id)} style={styles.checkDelete}>
                  <Feather name="x" size={16} color={colors.muted} />
                </Pressable>
              </View>
            ))}
            <Pressable testID="checklist-add" onPress={addChecklistItem} style={styles.addRow}>
              <Feather name="plus" size={16} color={colors.brandPrimary} />
              <Text style={styles.addRowText}>Add row</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>FOLDER</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderRow}>
          {folders.length ? folders.map((folder) => (
            <Pressable key={folder.id} testID={`folder-${folder.id}`} onPress={() => setFolderId(folderId === folder.id ? undefined : folder.id)} style={[styles.folderChip, folderId === folder.id && styles.folderChipActive]}>
              <View style={[styles.folderDot, { backgroundColor: folder.color }]} />
              <Text style={[styles.folderText, folderId === folder.id && styles.folderTextActive]}>{folder.name}</Text>
            </Pressable>
          )) : <Text style={styles.noFolders}>Add folders from the Archive tab.</Text>}
        </ScrollView>

        <Text style={styles.label}>LABELS <Text style={styles.optional}>OPTIONAL</Text></Text>
        <TextInput testID="labels-input" value={labelsText} onChangeText={setLabelsText} placeholder="design, read-later, inspiration" placeholderTextColor={colors.muted} style={[styles.textInput, styles.inputBox]} autoCapitalize="none" />

        <Pressable testID="save-button" onPress={() => void save()} disabled={busy} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
          <Text style={styles.saveText}>Save to Recall</Text>
          <Feather name="arrow-right" size={18} color={colors.onBrandPrimary} />
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary },
  topTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  heading: { color: colors.onSurface, fontSize: 29, lineHeight: 35, fontFamily: "Georgia", fontWeight: "500", marginTop: 26 },
  helper: { color: colors.onSurfaceSecondary, fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: 22 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  typeChip: { flexShrink: 0, minHeight: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surfaceSecondary },
  typeChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  typeLabel: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "700" },
  typeLabelActive: { color: colors.onBrandPrimary },
  fieldLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { color: colors.onSurface, fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginBottom: 8, marginTop: 18 },
  optional: { color: colors.muted, fontWeight: "500", letterSpacing: 0 },
  pasteButton: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 40 },
  pasteText: { color: colors.brandPrimary, fontSize: 12, fontWeight: "700" },
  inputBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.surfaceSecondary, minHeight: 50, paddingHorizontal: 14, justifyContent: "center" },
  inputError: { borderColor: colors.error },
  textInput: { color: colors.onSurface, fontSize: 15 },
  multiline: { minHeight: 110, paddingTop: 12, paddingBottom: 12, textAlignVertical: "top" },
  markdownHint: { color: colors.muted, fontSize: 11, marginTop: 7, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  extractButton: { minHeight: 46, borderRadius: 14, backgroundColor: colors.brandSecondary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 13 },
  extractText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: 14 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  preview: { flexDirection: "row", backgroundColor: colors.surfaceSecondary, borderRadius: 15, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginTop: 18, minHeight: 118 },
  previewImage: { width: 106, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  previewContent: { flex: 1, padding: 14 },
  previewDomain: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  previewTitle: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 16, lineHeight: 21, fontWeight: "500", marginTop: 5 },
  previewDescription: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  voiceBox: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, padding: 12, borderRadius: 15, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  voiceButton: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  voiceRecording: { backgroundColor: colors.error },
  voiceLabel: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  voiceHelper: { color: colors.muted, fontSize: 12, marginTop: 3 },
  imageDrop: { marginTop: 10, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, height: 170, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  imageDropText: { color: colors.onSurfaceSecondary, fontSize: 13, marginTop: 8 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.divider },
  checkInput: { flex: 1, color: colors.onSurface, fontSize: 15 },
  checkDelete: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  addRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 10, minHeight: 44 },
  addRowText: { color: colors.brandPrimary, fontSize: 13, fontWeight: "700" },
  error: { color: colors.error, fontSize: 13, marginTop: 14 },
  folderRow: { gap: 8, paddingBottom: 3 },
  folderChip: { minHeight: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.surfaceSecondary },
  folderChipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandSecondary },
  folderDot: { width: 8, height: 8, borderRadius: 4 },
  folderText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },
  folderTextActive: { color: colors.onBrandTertiary },
  noFolders: { color: colors.muted, fontSize: 13, paddingVertical: 9 },
  saveButton: { minHeight: 54, borderRadius: 27, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, marginTop: 28 },
  saveText: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: 15 },
}));
