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
const LEGACY_LINKS_KEY = "nexuslink.links.v1";
const LEGACY_FOLDERS_KEY = "nexuslink.folders.v1";

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
export async function clearAllData() { await AsyncStorage.multiRemove([ITEMS_KEY, FOLDERS_KEY, REMINDERS_KEY, LEGACY_LINKS_KEY, LEGACY_FOLDERS_KEY]); }
export async function exportData() { const [items, folders, reminders] = await Promise.all([loadItems(), loadFolders(), loadReminders()]); return JSON.stringify({ app: "Recall", exportedAt: new Date().toISOString(), items, folders, reminders }, null, 2); }