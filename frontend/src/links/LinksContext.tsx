import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { cancelReminderNotification } from "./notifications";
import { Folder, LinkItem, RecallItem, Reminder, loadFolders, loadItems, loadReminders, saveFolders, saveItems, saveReminders } from "./storage";

type NewItem = Omit<RecallItem, "id" | "createdAt" | "updatedAt">;
type LinksContextValue = {
  items: RecallItem[];
  links: LinkItem[];
  folders: Folder[];
  reminders: Reminder[];
  loading: boolean;
  addItem: (item: NewItem) => Promise<RecallItem>;
  updateItem: (id: string, patch: Partial<RecallItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  addFolder: (name: string) => Promise<void>;
  removeFolder: (id: string) => Promise<void>;
  addReminder: (reminder: Omit<Reminder, "id" | "createdAt">) => Promise<Reminder>;
  updateReminder: (id: string, patch: Partial<Reminder>) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};
const Context = createContext<LinksContextValue | null>(null);

export function LinksProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<RecallItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [nextItems, nextFolders, nextReminders] = await Promise.all([loadItems(), loadFolders(), loadReminders()]);
    setItems(nextItems); setFolders(nextFolders); setReminders(nextReminders); setLoading(false);
  }, []);

  useEffect(() => { refresh().catch(() => setLoading(false)); }, [refresh]);

  const addItem = useCallback(async (input: NewItem) => {
    const now = new Date().toISOString();
    const item: RecallItem = { ...input, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, createdAt: now, updatedAt: now };
    const next = [item, ...items];
    setItems(next); await saveItems(next); return item;
  }, [items]);

  const updateItem = useCallback(async (id: string, patch: Partial<RecallItem>) => {
    const next = items.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item);
    setItems(next); await saveItems(next);
  }, [items]);

  const removeItem = useCallback(async (id: string) => {
    const item = items.find((entry) => entry.id === id);
    const next = items.filter((entry) => entry.id !== id);
    setItems(next); await saveItems(next);
    if (item?.reminderId) await cancelReminderNotification(item.reminderId);
  }, [items]);

  const addFolder = useCallback(async (name: string) => {
    const palette = ["#C85A32", "#2D6A4F", "#B45309", "#7A2E12"];
    const folder: Folder = { id: `${Date.now()}`, name: name.trim(), color: palette[folders.length % palette.length], createdAt: new Date().toISOString() };
    const next = [...folders, folder]; setFolders(next); await saveFolders(next);
  }, [folders]);

  const removeFolder = useCallback(async (id: string) => {
    const nextFolders = folders.filter((folder) => folder.id !== id);
    const nextItems = items.map((item) => item.folderId === id ? { ...item, folderId: undefined } : item);
    setFolders(nextFolders); setItems(nextItems);
    await Promise.all([saveFolders(nextFolders), saveItems(nextItems)]);
  }, [folders, items]);

  const addReminder = useCallback(async (input: Omit<Reminder, "id" | "createdAt">) => {
    const reminder: Reminder = { ...input, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, createdAt: new Date().toISOString() };
    const next = [...reminders, reminder]; setReminders(next); await saveReminders(next); return reminder;
  }, [reminders]);

  const updateReminder = useCallback(async (id: string, patch: Partial<Reminder>) => {
    const next = reminders.map((reminder) => reminder.id === id ? { ...reminder, ...patch } : reminder);
    setReminders(next); await saveReminders(next);
  }, [reminders]);

  const removeReminder = useCallback(async (id: string) => {
    const next = reminders.filter((reminder) => reminder.id !== id);
    setReminders(next); await saveReminders(next); await cancelReminderNotification(id);
  }, [reminders]);

  const value = useMemo<LinksContextValue>(() => ({
    items,
    links: items.filter((item) => item.type === "link"),
    folders, reminders, loading,
    addItem, updateItem, removeItem,
    addFolder, removeFolder,
    addReminder, updateReminder, removeReminder,
    refresh,
  }), [items, folders, reminders, loading, addItem, updateItem, removeItem, addFolder, removeFolder, addReminder, updateReminder, removeReminder, refresh]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLinks() {
  const value = useContext(Context);
  if (!value) throw new Error("useLinks must be used inside LinksProvider");
  return value;
}
