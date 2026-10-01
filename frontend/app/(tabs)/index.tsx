import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLinks } from "@/src/links/LinksContext";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

export default function HomeScreen() {
  const router = useRouter(); const insets = useSafeAreaInsets(); const { colors } = useTheme();
  const { links, folders, loading } = useLinks(); const [query, setQuery] = useState(""); const [folderId, setFolderId] = useState<string>();
  useEffect(() => {
    const handleIncoming = (value?: string | null) => {
      if (!value) return;
      try { const parsed = new URL(value); const shared = parsed.searchParams.get("text") || parsed.searchParams.get("url"); if (shared) router.push({ pathname: "/add", params: { url: shared } }); }
      catch { if (/^https?:\/\//i.test(value)) router.push({ pathname: "/add", params: { url: value } }); }
    };
    Linking.getInitialURL().then(handleIncoming).catch(() => undefined);
    const subscription = Linking.addEventListener("url", ({ url }) => handleIncoming(url));
    return () => subscription.remove();
  }, [router]);
  const filtered = useMemo(() => links.filter((link) => {
    const matchesFolder = !folderId || link.folderId === folderId;
    const haystack = `${link.title} ${link.domain} ${link.description} ${link.tags.join(" ")}`.toLowerCase();
    return matchesFolder && haystack.includes(query.trim().toLowerCase());
  }), [links, folderId, query]);
  const styles = useStyles();
  return <View style={styles.screen}>
    <FlatList
      data={filtered} keyExtractor={(item) => item.id} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: 28 + (usesNativeTabs ? insets.bottom : 0), paddingHorizontal: 20 }}
      ListHeaderComponent={<View>
        <View style={styles.header}><View><Text style={styles.eyebrow}>YOUR PRIVATE ARCHIVE</Text><Text style={styles.title}>NexusLink</Text></View><Pressable testID="add-link-button" accessibilityRole="button" onPress={() => router.push("/add")} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}><Feather name="plus" color={colors.onBrandPrimary} size={22} /><Text style={styles.addButtonText}>Add</Text></Pressable></View>
        <Text style={styles.subtitle}>Keep the good things you find.</Text>
        <View style={styles.searchBox}><Feather name="search" size={18} color={colors.muted} /><TextInput testID="search-input" value={query} onChangeText={setQuery} placeholder="Search your links" placeholderTextColor={colors.muted} style={styles.searchInput} returnKeyType="search" /></View>
        {folders.length > 0 ? <FlatList horizontal showsHorizontalScrollIndicator={false} data={[{ id: "all", name: "All links" }, ...folders]} keyExtractor={(item) => item.id} contentContainerStyle={styles.chips} renderItem={({ item }) => <Pressable onPress={() => setFolderId(item.id === "all" ? undefined : item.id)} style={[styles.chip, (!folderId && item.id === "all") || folderId === item.id ? styles.chipActive : null]}><Text style={[styles.chipText, (!folderId && item.id === "all") || folderId === item.id ? styles.chipTextActive : null]}>{item.name}</Text></Pressable>} /> : null}
        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{query || folderId ? "Matching links" : "Recently saved"}</Text><Text style={styles.count}>{filtered.length} {filtered.length === 1 ? "link" : "links"}</Text></View>
      </View>}
      renderItem={({ item }) => <Pressable testID={`link-card-${item.id}`} onPress={() => router.push({ pathname: "/link/[id]", params: { id: item.id } })} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        <View style={styles.cardTop}><View style={styles.domainMark}><Feather name="link" size={15} color={colors.brandPrimary} /></View><Text style={styles.domain} numberOfLines={1}>{item.domain}</Text><Feather name="arrow-up-right" size={17} color={colors.muted} /></View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>{item.description ? <Text style={styles.description} numberOfLines={2}>{item.description}</Text> : null}
        <View style={styles.tagRow}>{item.tags.slice(0, 3).map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View>
      </Pressable>}
      ListEmptyComponent={loading ? <View style={styles.empty}><ActivityIndicator color={colors.brandPrimary} /><Text style={styles.emptyTitle}>Opening your archive…</Text></View> : <View style={styles.empty}><View style={styles.emptyIcon}><Feather name="bookmark" size={28} color={colors.brandPrimary} /></View><Text style={styles.emptyTitle}>No links archived yet</Text><Text style={styles.emptyBody}>Share a page from any app, or paste a link here to start your private collection.</Text><Pressable onPress={() => router.push("/add")} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Feather name="plus" size={18} color={colors.onBrandPrimary} /><Text style={styles.primaryButtonText}>Add your first link</Text></Pressable></View>}
    />
  </View>;
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, eyebrow: { color: colors.brandPrimary, fontSize: 11, letterSpacing: 1.5, fontWeight: "700" }, title: { color: colors.onSurface, fontSize: 34, fontWeight: "700", fontFamily: "Georgia", marginTop: 4 }, subtitle: { color: colors.onSurfaceSecondary, fontSize: 16, marginTop: 6, marginBottom: 22 }, addButton: { minHeight: 46, paddingHorizontal: 16, borderRadius: 24, backgroundColor: colors.brandPrimary, flexDirection: "row", alignItems: "center", gap: 7 }, addButtonText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700" }, pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] }, searchBox: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 10 }, searchInput: { flex: 1, color: colors.onSurface, fontSize: 15 }, chips: { gap: 8, paddingVertical: 16 }, chip: { borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, minHeight: 38, justifyContent: "center", backgroundColor: colors.surface }, chipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandSecondary }, chipText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" }, chipTextActive: { color: colors.onBrandTertiary }, sectionHeading: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 4, marginBottom: 12 }, sectionTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "700", fontFamily: "Georgia" }, count: { color: colors.muted, fontSize: 13 }, card: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 17, marginBottom: 12, borderWidth: 1, borderColor: colors.border }, cardPressed: { backgroundColor: colors.surfaceTertiary }, cardTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }, domainMark: { width: 27, height: 27, borderRadius: 14, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" }, domain: { flex: 1, color: colors.brandPrimary, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 }, cardTitle: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 19, lineHeight: 25, fontWeight: "700" }, description: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 }, tagRow: { flexDirection: "row", gap: 8, marginTop: 14 }, tag: { color: colors.brandPrimary, fontSize: 12, fontWeight: "600" }, empty: { alignItems: "center", paddingTop: 90, paddingHorizontal: 30 }, emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: 18 }, emptyTitle: { color: colors.onSurface, fontSize: 21, fontFamily: "Georgia", fontWeight: "700", textAlign: "center" }, emptyBody: { color: colors.onSurfaceSecondary, fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 10 }, primaryButton: { minHeight: 48, borderRadius: 25, backgroundColor: colors.brandPrimary, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 19, marginTop: 24 }, primaryButtonText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: 14 },
}));