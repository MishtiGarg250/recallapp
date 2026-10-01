import { Feather } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLinks } from "@/src/links/LinksContext";
import { scheduleReminderNotification, startLocationReminder } from "@/src/links/notifications";
import type { LocationTrigger, ReminderRepeat } from "@/src/links/storage";
import { makeStyles, useTheme } from "@/src/theme";

const repeats: { key: ReminderRepeat; label: string }[] = [
  { key: "none", label: "Once" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

type Mode = "time" | "place";

export default function ReminderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { addReminder } = useLinks();

  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("time");
  const [date, setDate] = useState(() => { const next = new Date(); next.setMinutes(next.getMinutes() + 30, 0, 0); return next; });
  const [repeat, setRepeat] = useState<ReminderRepeat>("none");
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">("time");

  const [placeLabel, setPlaceLabel] = useState("");
  const [locMode, setLocMode] = useState<"arrive" | "leave">("arrive");
  const [radius, setRadius] = useState("100");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [busyPlace, setBusyPlace] = useState(false);
  const [error, setError] = useState("");

  function openPicker(which: "date" | "time") {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({ value: date, mode: which, onChange: (_, selected) => { if (selected) setDate(selected); } });
    } else {
      setPickerMode(which);
      setShowPicker(true);
    }
  }

  async function captureHere() {
    setError("");
    setBusyPlace(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) throw new Error("Allow location to pick a place.");
      const current = await Location.getCurrentPositionAsync({});
      setCoords({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      if (!placeLabel) {
        try {
          const geocoded = (await Location.reverseGeocodeAsync(current.coords))[0];
          setPlaceLabel([geocoded?.name, geocoded?.city].filter(Boolean).join(", ") || "This place");
        } catch { setPlaceLabel("This place"); }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read your location.");
    } finally {
      setBusyPlace(false);
    }
  }

  async function save() {
    setError("");
    if (!title.trim()) { setError("Add a quick title."); return; }
    try {
      if (mode === "time") {
        if (date.getTime() < Date.now() - 60_000) throw new Error("Pick a time in the future.");
        const reminder = await addReminder({ title: title.trim(), date: date.toISOString(), repeat, completed: false });
        await scheduleReminderNotification({ id: reminder.id, title: reminder.title, date: reminder.date, repeat: reminder.repeat });
      } else {
        if (!coords) throw new Error("Pick a place first.");
        const parsedRadius = Math.max(50, Math.min(1000, Number(radius) || 100));
        const location: LocationTrigger = { latitude: coords.latitude, longitude: coords.longitude, radius: parsedRadius, label: placeLabel || "This place", mode: locMode };
        const reminder = await addReminder({ title: title.trim(), date: new Date().toISOString(), repeat: "none", completed: false, location });
        const started = await startLocationReminder({ id: reminder.id, title: reminder.title, location });
        if (!started) setError("Reminder saved. Enable location access to trigger it.");
      }
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save reminder.");
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32, paddingHorizontal: 20 }}>
        <View style={styles.topbar}>
          <Pressable testID="reminder-close" onPress={() => router.back()} style={styles.iconButton}>
            <Feather name="x" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.topTitle}>New reminder</Text>
          <View style={{ width: 44 }} />
        </View>

        <Text style={styles.heading}>Nudge future you.</Text>
        <Text style={styles.helper}>Pick a time, or a place you’ll pass by.</Text>

        <View style={styles.modeRow}>
          {([{ key: "time", label: "At a time", icon: "clock" }, { key: "place", label: "At a place", icon: "map-pin" }] as const).map((entry) => {
            const active = mode === entry.key;
            return (
              <Pressable key={entry.key} testID={`mode-${entry.key}`} onPress={() => setMode(entry.key)} style={[styles.modeChip, active && styles.modeChipActive]}>
                <Feather name={entry.icon} size={15} color={active ? colors.onBrandPrimary : colors.brandPrimary} />
                <Text style={[styles.modeText, active && styles.modeTextActive]}>{entry.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>TITLE</Text>
        <TextInput testID="reminder-title" value={title} onChangeText={setTitle} placeholder="e.g. Read the article tonight" placeholderTextColor={colors.muted} style={styles.textInput} />

        {mode === "time" ? (
          <View>
            <Text style={styles.label}>WHEN</Text>
            <View style={styles.row}>
              <Pressable testID="pick-date" onPress={() => openPicker("date")} style={styles.pickCard}>
                <Feather name="calendar" size={16} color={colors.brandPrimary} />
                <Text style={styles.pickText}>{date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</Text>
              </Pressable>
              <Pressable testID="pick-time" onPress={() => openPicker("time")} style={styles.pickCard}>
                <Feather name="clock" size={16} color={colors.brandPrimary} />
                <Text style={styles.pickText}>{date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text>
              </Pressable>
            </View>
            {Platform.OS === "ios" && showPicker ? (
              <DateTimePicker value={date} mode={pickerMode} display="spinner" onChange={(_, selected) => { if (selected) setDate(selected); setShowPicker(false); }} />
            ) : null}
            <Text style={styles.label}>REPEAT</Text>
            <View style={styles.repeatRow}>
              {repeats.map((entry) => {
                const active = repeat === entry.key;
                return (
                  <Pressable key={entry.key} testID={`repeat-${entry.key}`} onPress={() => setRepeat(entry.key)} style={[styles.repeatChip, active && styles.repeatChipActive]}>
                    <Text style={[styles.repeatText, active && styles.repeatTextActive]}>{entry.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.label}>PLACE NAME</Text>
            <TextInput testID="place-label" value={placeLabel} onChangeText={setPlaceLabel} placeholder="e.g. The office" placeholderTextColor={colors.muted} style={styles.textInput} />
            <Pressable testID="use-current-location" disabled={busyPlace} onPress={() => void captureHere()} style={styles.locButton}>
              <Feather name="crosshair" size={16} color={colors.onBrandPrimary} />
              <Text style={styles.locText}>{busyPlace ? "Reading location…" : coords ? "Place pinned" : "Use my current location"}</Text>
            </Pressable>
            {coords ? (
              <Text style={styles.coordsHint}>{coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}</Text>
            ) : null}
            <Text style={styles.label}>TRIGGER</Text>
            <View style={styles.repeatRow}>
              {(["arrive", "leave"] as const).map((entry) => {
                const active = locMode === entry;
                return (
                  <Pressable key={entry} testID={`trigger-${entry}`} onPress={() => setLocMode(entry)} style={[styles.repeatChip, active && styles.repeatChipActive]}>
                    <Text style={[styles.repeatText, active && styles.repeatTextActive]}>When I {entry}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.label}>RADIUS (METERS)</Text>
            <TextInput testID="radius-input" value={radius} onChangeText={setRadius} keyboardType="number-pad" style={styles.textInput} placeholder="100" placeholderTextColor={colors.muted} />
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable testID="save-reminder" onPress={() => void save()} style={styles.saveButton}>
          <Text style={styles.saveText}>Save reminder</Text>
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
  modeRow: { flexDirection: "row", gap: 8 },
  modeChip: { flexShrink: 0, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.surfaceSecondary },
  modeChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  modeText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "700" },
  modeTextActive: { color: colors.onBrandPrimary },
  label: { color: colors.onSurface, fontSize: 11, fontWeight: "800", letterSpacing: 1.2, marginBottom: 8, marginTop: 20 },
  textInput: { minHeight: 50, color: colors.onSurface, fontSize: 15, borderWidth: 1, borderColor: colors.border, borderRadius: 13, paddingHorizontal: 14, backgroundColor: colors.surfaceSecondary },
  row: { flexDirection: "row", gap: 10 },
  pickCard: { flex: 1, minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  pickText: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  repeatRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  repeatChip: { flexShrink: 0, minHeight: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, justifyContent: "center", backgroundColor: colors.surfaceSecondary },
  repeatChipActive: { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary },
  repeatText: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "700" },
  repeatTextActive: { color: colors.onBrandTertiary },
  locButton: { marginTop: 10, minHeight: 48, borderRadius: 14, backgroundColor: colors.brandSecondary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  locText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "700" },
  coordsHint: { color: colors.muted, fontSize: 12, marginTop: 7 },
  error: { color: colors.error, fontSize: 13, marginTop: 14 },
  saveButton: { minHeight: 54, borderRadius: 27, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, marginTop: 28 },
  saveText: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: 15 },
}));
