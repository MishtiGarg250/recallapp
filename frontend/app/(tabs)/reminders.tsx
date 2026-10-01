import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLinks } from "@/src/links/LinksContext";
import { cancelReminderNotification } from "@/src/links/notifications";
import type { Reminder } from "@/src/links/storage";
import { usesNativeTabs } from "@/src/navigation";
import { makeStyles, useTheme } from "@/src/theme";

type Tab = "upcoming" | "completed" | "location";

export default function RemindersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { reminders, updateReminder, removeReminder } = useLinks();
  const [tab, setTab] = useState<Tab>("upcoming");

  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const list = useMemo(() => {
    const sorted = [...reminders].sort((a, b) => a.date.localeCompare(b.date));
    if (tab === "upcoming") return sorted.filter((r) => !r.completed && !r.location);
    if (tab === "completed") return sorted.filter((r) => r.completed);
    return sorted.filter((r) => r.location);
  }, [reminders, tab]);

  async function complete(reminder: Reminder) {
    await updateReminder(reminder.id, { completed: !reminder.completed });
    if (!reminder.completed) await cancelReminderNotification(reminder.id);
  }

  function askRemove(reminder: Reminder) {
    Alert.alert("Delete this reminder?", "It won’t notify you anymore.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void removeReminder(reminder.id) },
    ]);
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: 30 + bottomChrome + 72, paddingHorizontal: 20 }}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>GENTLE NUDGES</Text>
                <Text style={styles.title}>Reminders</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Private alerts that only your phone knows about.</Text>
            <View style={styles.tabs}>
              {([
                { key: "upcoming", label: "Upcoming" },
                { key: "completed", label: "Done" },
                { key: "location", label: "Places" },
              ] as const).map((entry) => {
                const active = tab === entry.key;
                return (
                  <Pressable key={entry.key} testID={`reminder-tab-${entry.key}`} onPress={() => setTab(entry.key)} style={[styles.tabChip, active && styles.tabChipActive]}>
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>{entry.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.reminderCard} testID={`reminder-${item.id}`}>
            <Pressable testID={`reminder-complete-${item.id}`} onPress={() => void complete(item)} style={styles.circle}>
              <Feather name={item.completed ? "check-circle" : "circle"} size={24} color={item.completed ? colors.brandPrimary : colors.muted} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.reminderTitle, item.completed && styles.doneTitle]}>{item.title}</Text>
              <View style={styles.metaRow}>
                <Feather name={item.location ? "map-pin" : "clock"} size={13} color={colors.muted} />
                <Text style={styles.metaText}>
                  {item.location ? `${item.location.mode === "arrive" ? "When I arrive at" : "When I leave"} ${item.location.label}` : new Date(item.date).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </Text>
                {item.repeat !== "none" && !item.location ? <Text style={styles.badge}>{item.repeat}</Text> : null}
              </View>
            </View>
            <Pressable testID={`reminder-delete-${item.id}`} onPress={() => askRemove(item)} style={styles.deleteBtn}>
              <Feather name="trash-2" size={16} color={colors.muted} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Feather name="bell" size={27} color={colors.brandPrimary} /></View>
            <Text style={styles.emptyTitle}>Nothing scheduled</Text>
            <Text style={styles.emptyBody}>{tab === "location" ? "Set a place-based reminder for errands and arrivals." : tab === "completed" ? "Checked-off reminders will live here." : "Tap the button below to add a nudge for later."}</Text>
          </View>
        }
      />
      <Pressable testID="add-reminder-fab" onPress={() => router.push("/reminder")} style={[styles.fab, { bottom: bottomChrome + 16 }]}>
        <Feather name="plus" size={22} color={colors.onBrandPrimary} />
        <Text style={styles.fabText}>New reminder</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: colors.brandPrimary, fontSize: 10, letterSpacing: 1.3, fontWeight: "700" },
  title: { color: colors.onSurface, fontSize: 32, fontFamily: "Georgia", fontWeight: "500", marginTop: 4 },
  subtitle: { color: colors.onSurfaceSecondary, fontSize: 15, marginTop: 8, marginBottom: 18 },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 18 },
  tabChip: { flexShrink: 0, minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, justifyContent: "center" },
  tabChipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  tabText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: colors.onBrandTertiary },
  reminderCard: { flexDirection: "row", alignItems: "center", gap: 11, minHeight: 72, backgroundColor: colors.surfaceSecondary, borderRadius: 15, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, marginBottom: 10 },
  circle: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  reminderTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  doneTitle: { color: colors.muted, textDecorationLine: "line-through" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" },
  metaText: { color: colors.muted, fontSize: 12 },
  badge: { color: colors.brandPrimary, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginLeft: 4 },
  deleteBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 56, paddingHorizontal: 28 },
  emptyIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { color: colors.onSurface, fontFamily: "Georgia", fontSize: 20, fontWeight: "500" },
  emptyBody: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 9 },
  fab: { position: "absolute", right: 20, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 16, minHeight: 50, borderRadius: 25, backgroundColor: colors.brandPrimary },
  fabText: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: 14 },
}));
