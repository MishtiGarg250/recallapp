import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { Folder, LinkItem, loadFolders, loadLinks, saveFolders, saveLinks } from "./storage";

type LinksContextValue = {
  links: LinkItem[]; folders: Folder[]; loading: boolean;
  addLink: (link: Omit<LinkItem, "id" | "createdAt">) => Promise<LinkItem>;
  updateLink: (id: string, patch: Partial<LinkItem>) => Promise<void>;
  removeLink: (id: string) => Promise<void>;
  addFolder: (name: string) => Promise<void>; removeFolder: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};
const Context = createContext<LinksContextValue | null>(null);

export function LinksProvider({ children }: PropsWithChildren) {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const [savedLinks, savedFolders] = await Promise.all([loadLinks(), loadFolders()]);
    setLinks(savedLinks); setFolders(savedFolders); setLoading(false);
  }, []);
  useEffect(() => { refresh().catch(() => setLoading(false)); }, [refresh]);
  const addLink = useCallback(async (input: Omit<LinkItem, "id" | "createdAt">) => {
    const link = { ...input, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, createdAt: new Date().toISOString() };
    const next = [link, ...links]; setLinks(next); await saveLinks(next); return link;
  }, [links]);
  const updateLink = useCallback(async (id: string, patch: Partial<LinkItem>) => {
    const next = links.map((item) => item.id === id ? { ...item, ...patch } : item);
    setLinks(next); await saveLinks(next);
  }, [links]);
  const removeLink = useCallback(async (id: string) => {
    const next = links.filter((item) => item.id !== id); setLinks(next); await saveLinks(next);
  }, [links]);
  const addFolder = useCallback(async (name: string) => {
    const palette = ["#8C5E3C", "#3C5E8C", "#3B6D51", "#8C6A3C"];
    const folder = { id: `${Date.now()}`, name: name.trim(), color: palette[folders.length % palette.length], createdAt: new Date().toISOString() };
    const next = [...folders, folder]; setFolders(next); await saveFolders(next);
  }, [folders]);
  const removeFolder = useCallback(async (id: string) => {
    const nextFolders = folders.filter((folder) => folder.id !== id);
    const nextLinks = links.map((link) => link.folderId === id ? { ...link, folderId: undefined } : link);
    setFolders(nextFolders); setLinks(nextLinks); await Promise.all([saveFolders(nextFolders), saveLinks(nextLinks)]);
  }, [folders, links]);
  const value = useMemo(() => ({ links, folders, loading, addLink, updateLink, removeLink, addFolder, removeFolder, refresh }), [links, folders, loading, addLink, updateLink, removeLink, addFolder, removeFolder, refresh]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLinks() { const value = useContext(Context); if (!value) throw new Error("useLinks must be used inside LinksProvider"); return value; }