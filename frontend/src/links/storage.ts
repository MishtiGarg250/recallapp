import AsyncStorage from "@react-native-async-storage/async-storage";

export type LinkItem = {
  id: string;
  url: string;
  title: string;
  description: string;
  domain: string;
  previewImage?: string;
  folderId?: string;
  tags: string[];
  notes: string;
  createdAt: string;
};

export type Folder = { id: string; name: string; color: string; createdAt: string };

const LINKS_KEY = "nexuslink.links.v1";
const FOLDERS_KEY = "nexuslink.folders.v1";

export async function loadLinks(): Promise<LinkItem[]> {
  const value = await AsyncStorage.getItem(LINKS_KEY);
  return value ? (JSON.parse(value) as LinkItem[]) : [];
}

export async function saveLinks(links: LinkItem[]) {
  await AsyncStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

export async function loadFolders(): Promise<Folder[]> {
  const value = await AsyncStorage.getItem(FOLDERS_KEY);
  return value ? (JSON.parse(value) as Folder[]) : [];
}

export async function saveFolders(folders: Folder[]) {
  await AsyncStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
}

export async function clearAllData() {
  await AsyncStorage.multiRemove([LINKS_KEY, FOLDERS_KEY]);
}

export async function exportData() {
  const [links, folders] = await Promise.all([loadLinks(), loadFolders()]);
  return JSON.stringify({ exportedAt: new Date().toISOString(), links, folders }, null, 2);
}