import AsyncStorage from "@react-native-async-storage/async-storage";

export type ItemType = "link" | "note" | "checklist" | "snippet" | "image";
export type ChecklistItem = { id: string; text: string; done: boolean };
export type RecallItem = {
  id: string; type: ItemType; title: string; body: string; url?: string; domain?: string;
  description?: string; previewImage?: string; imageUri?: string; voiceUri?: string;
  checklist?: ChecklistItem[]; folderId?: string; labels: string[]; notes: string;
  pinned: boolean; archived: boolean; createdAt: string; updatedAt: string; reminderId?: string;
};
export type LinkItem = RecallItem;
export type Folder = { id: string; name: string; color: string; createdAt: string };
export type ReminderRepeat = "none" | "daily" | "weekly" | "monthly";
export type LocationTrigger = { latitude: number; longitude: number; radius: number; label: string; mode: "arrive" | "leave" };
export type Reminder = { id: string; itemId?: string; title: string; date: string; repeat: ReminderRepeat; completed: boolean; notificationId?: string; location?: LocationTrigger; createdAt: string };

const ITEMS_KEY = "recall.items.v1";
const FOLDERS_KEY = "recall.folders.v1";
const REMINDERS_KEY = "recall.reminders.v1";
const SHARE_FOLDER_KEY = "recall.settings.shareFolderId.v1";
const ONBOARDED_KEY = "recall.onboarded.v1";
const LEGACY_LINKS_KEY = "nexuslink.links.v1";
const LEGACY_FOLDERS_KEY = "nexuslink.folders.v1";

export async function hasOnboarded(): Promise<boolean> {
  return (await AsyncStorage.getItem(ONBOARDED_KEY)) === "1";
}
export async function markOnboarded() {
  await AsyncStorage.setItem(ONBOARDED_KEY, "1");
}

async function read<T>(key: string, fallback: T): Promise<T> {
  const value = await AsyncStorage.getItem(key);
  return value ? (JSON.parse(value) as T) : fallback;
}

export async function loadItems(): Promise<RecallItem[]> {
  const current = await read<RecallItem[]>(ITEMS_KEY, []);
  if (current.length) return current;
  type LegacyLink = { id: string; title: string; description?: string; domain?: string; previewImage?: string; url: string; folderId?: string; tags?: string[]; notes?: string; createdAt: string };
  const legacy = await read<LegacyLink[]>(LEGACY_LINKS_KEY, []);
  return legacy.map((item) => ({
    id: item.id,
    type: "link",
    title: item.title,
    body: item.description ?? "",
    url: item.url,
    domain: item.domain,
    description: item.description,
    previewImage: item.previewImage,
    folderId: item.folderId,
    labels: item.tags ?? [],
    notes: item.notes ?? "",
    pinned: false,
    archived: false,
    createdAt: item.createdAt,
    updatedAt: item.createdAt,
  }));
}
export async function saveItems(items: RecallItem[]) { await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items)); }
export async function loadLinks() { return loadItems(); }
export async function loadFolders(): Promise<Folder[]> {
  const current = await read<Folder[]>(FOLDERS_KEY, []);
  return current.length ? current : read<Folder[]>(LEGACY_FOLDERS_KEY, []);
}
export async function saveFolders(folders: Folder[]) { await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(folders)); }
export async function loadReminders(): Promise<Reminder[]> { return read(REMINDERS_KEY, []); }
export async function saveReminders(reminders: Reminder[]) { await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders)); }
export async function clearAllData() { await AsyncStorage.multiRemove([ITEMS_KEY, FOLDERS_KEY, REMINDERS_KEY, SHARE_FOLDER_KEY, ONBOARDED_KEY, LEGACY_LINKS_KEY, LEGACY_FOLDERS_KEY]); }
export async function exportData() { const [items, folders, reminders] = await Promise.all([loadItems(), loadFolders(), loadReminders()]); return JSON.stringify({ app: "Recall", exportedAt: new Date().toISOString(), items, folders, reminders }, null, 2); }

export async function getDefaultShareFolderId(): Promise<string | null> {
  const value = await AsyncStorage.getItem(SHARE_FOLDER_KEY);
  return value ? value : null;
}
export async function setDefaultShareFolderId(folderId: string | null) {
  if (folderId) await AsyncStorage.setItem(SHARE_FOLDER_KEY, folderId);
  else await AsyncStorage.removeItem(SHARE_FOLDER_KEY);
}

function escapeMd(text: string) { return text.replace(/\|/g, "\\|"); }

export async function exportMarkdown(): Promise<string> {
  const [items, folders, reminders] = await Promise.all([loadItems(), loadFolders(), loadReminders()]);
  const folderName = (id?: string) => folders.find((f) => f.id === id)?.name ?? "Unfiled";
  const date = new Date().toLocaleString();
  const lines: string[] = [`# Recall archive`, `_Exported ${date} • ${items.length} items • ${folders.length} folders • ${reminders.length} reminders_`, ""];

  // Group items by folder
  const grouped = new Map<string, RecallItem[]>();
  for (const item of items) {
    const key = item.folderId ?? "__unfiled__";
    const bucket = grouped.get(key) ?? [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  const folderOrder = [...folders.map((f) => f.id), "__unfiled__"];
  for (const key of folderOrder) {
    const bucket = grouped.get(key);
    if (!bucket || !bucket.length) continue;
    const name = key === "__unfiled__" ? "Unfiled" : folderName(key);
    lines.push(`## ${escapeMd(name)}`);
    for (const item of bucket) {
      lines.push("");
      const flags = [item.pinned ? "★ pinned" : null, item.archived ? "archived" : null].filter(Boolean).join(" • ");
      lines.push(`### ${escapeMd(item.title)}${flags ? `  _(${flags})_` : ""}`);
      lines.push(`_${item.type}${item.domain ? ` • ${item.domain}` : ""} • ${new Date(item.createdAt).toLocaleDateString()}_`);
      if (item.url) lines.push(`[${item.url}](${item.url})`);
      if (item.body) { lines.push(""); lines.push(item.body); }
      if (item.type === "checklist" && item.checklist?.length) {
        lines.push("");
        for (const entry of item.checklist) lines.push(`- [${entry.done ? "x" : " "}] ${entry.text}`);
      }
      if (item.imageUri) lines.push(`_(image saved locally)_`);
      if (item.voiceUri) lines.push(`_(voice snippet saved locally)_`);
      if (item.notes) { lines.push(""); lines.push(`> ${item.notes.replace(/\n/g, "\n> ")}`); }
      if (item.labels.length) lines.push(`Tags: ${item.labels.map((l) => `\`#${l}\``).join(" ")}`);
    }
    lines.push("");
  }

  if (reminders.length) {
    lines.push("## Reminders");
    for (const reminder of reminders) {
      const when = reminder.location ? `${reminder.location.mode === "arrive" ? "On arrive at" : "On leave of"} ${reminder.location.label}` : `${new Date(reminder.date).toLocaleString()}${reminder.repeat !== "none" ? ` (${reminder.repeat})` : ""}`;
      lines.push(`- [${reminder.completed ? "x" : " "}] ${escapeMd(reminder.title)} — _${when}_`);
    }
  }

  return lines.join("\n");
}