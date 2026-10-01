import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { loadReminders } from "./storage";

export const GEOFENCE_TASK = "recall-location-reminders";

// Expo Go on Android (SDK 53+) *throws* at expo-notifications import time
// because the module auto-registers for remote push tokens, which is no longer
// supported. Recall only ever uses *local* scheduled notifications, so we
// lazily and defensively require the module. In Expo Go on Android we skip the
// require entirely; everywhere else it loads normally and local scheduling works.
const isExpoGoAndroid =
  Platform.OS === "android" &&
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type Notif = typeof import("expo-notifications");
type Loc = typeof import("expo-location");
type Task = typeof import("expo-task-manager");

let Notifications: Notif | null = null;
let Location: Loc | null = null;
let TaskManager: Task | null = null;

function getNotifications(): Notif | null {
  if (Notifications || isExpoGoAndroid) return Notifications;
  try {
    Notifications = require("expo-notifications") as Notif;
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    } catch { /* best-effort */ }
    return Notifications;
  } catch {
    return null;
  }
}

function getLocation(): Loc | null {
  if (Location) return Location;
  try { Location = require("expo-location") as Loc; return Location; } catch { return null; }
}

function getTaskManager(): Task | null {
  if (TaskManager) return TaskManager;
  try { TaskManager = require("expo-task-manager") as Task; return TaskManager; } catch { return null; }
}

if (Platform.OS !== "web" && !isExpoGoAndroid) {
  const tm = getTaskManager();
  try {
    tm?.defineTask(GEOFENCE_TASK, async ({ data, error }: { data?: unknown; error?: unknown }) => {
      if (error || !data) return;
      const event = data as { region?: { identifier?: string } };
      const reminder = (await loadReminders()).find((item) => item.id === event.region?.identifier);
      if (!reminder) return;
      const notif = getNotifications();
      await notif?.scheduleNotificationAsync({
        content: { title: "Recall reminder", body: reminder.title, data: { reminderId: reminder.id } },
        trigger: null,
      });
    });
  } catch { /* already defined on fast refresh */ }
}

export async function requestNotificationPermissions() {
  const notif = getNotifications();
  if (!notif) return false;
  try {
    const current = await notif.getPermissionsAsync();
    if (current.granted) return true;
    return (await notif.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function scheduleReminderNotification(reminder: { id: string; title: string; date: string; repeat: "none" | "daily" | "weekly" | "monthly" }) {
  const notif = getNotifications();
  if (!notif) return undefined;
  const allowed = await requestNotificationPermissions();
  if (!allowed) return undefined;
  await cancelReminderNotification(reminder.id);
  const date = new Date(reminder.date);
  const T = notif.SchedulableTriggerInputTypes;
  let trigger: import("expo-notifications").NotificationTriggerInput = { type: T.DATE, date };
  if (reminder.repeat === "daily") trigger = { type: T.DAILY, hour: date.getHours(), minute: date.getMinutes() };
  if (reminder.repeat === "weekly") trigger = { type: T.WEEKLY, weekday: date.getDay() + 1, hour: date.getHours(), minute: date.getMinutes() };
  if (reminder.repeat === "monthly") trigger = { type: T.MONTHLY, day: date.getDate(), hour: date.getHours(), minute: date.getMinutes() } as import("expo-notifications").NotificationTriggerInput;
  try {
    return await notif.scheduleNotificationAsync({
      identifier: reminder.id,
      content: { title: "Recall reminder", body: reminder.title, data: { reminderId: reminder.id } },
      trigger,
    });
  } catch {
    return undefined;
  }
}

export async function cancelReminderNotification(id: string) {
  const notif = getNotifications();
  if (!notif) return;
  try { await notif.cancelScheduledNotificationAsync(id); } catch { /* may not exist */ }
}

export async function startLocationReminder(reminder: { id: string; title: string; location?: { latitude: number; longitude: number; radius: number; mode: "arrive" | "leave" } }) {
  if (!reminder.location) return false;
  if (Platform.OS === "web" || isExpoGoAndroid) return false;
  const loc = getLocation();
  if (!loc) return false;
  const foreground = await loc.requestForegroundPermissionsAsync();
  if (!foreground.granted) return false;
  const background = await loc.requestBackgroundPermissionsAsync();
  if (!background.granted) return false;
  const enter = reminder.location.mode === "arrive";
  await loc.startGeofencingAsync(GEOFENCE_TASK, [{
    identifier: reminder.id,
    latitude: reminder.location.latitude,
    longitude: reminder.location.longitude,
    radius: reminder.location.radius,
    notifyOnEnter: enter,
    notifyOnExit: !enter,
  }]);
  return true;
}

export const canUseLocalNotifications = !isExpoGoAndroid;
