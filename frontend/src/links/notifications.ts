import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { loadReminders } from "./storage";

export const GEOFENCE_TASK = "recall-location-reminders";

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // Expo Go on Android emits a notice about removed remote push support.
  // Local scheduled notifications still work; setting the handler is best-effort.
}

if (Platform.OS !== "web") {
  try {
    TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
      if (error || !data) return;
      const event = data as { eventType?: Location.GeofencingEventType; region?: { identifier?: string } };
      const reminder = (await loadReminders()).find((item) => item.id === event.region?.identifier);
      if (!reminder) return;
      await Notifications.scheduleNotificationAsync({
        content: { title: "Recall reminder", body: reminder.title, data: { reminderId: reminder.id } },
        trigger: null,
      });
    });
  } catch {
    // Task may already be defined on fast refresh.
  }
}

export async function requestNotificationPermissions() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function scheduleReminderNotification(reminder: { id: string; title: string; date: string; repeat: "none" | "daily" | "weekly" | "monthly" }) {
  const allowed = await requestNotificationPermissions();
  if (!allowed) return undefined;
  await cancelReminderNotification(reminder.id);
  const date = new Date(reminder.date);
  let trigger: Notifications.NotificationTriggerInput = { type: Notifications.SchedulableTriggerInputTypes.DATE, date };
  if (reminder.repeat === "daily") {
    trigger = { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: date.getHours(), minute: date.getMinutes() };
  }
  if (reminder.repeat === "weekly") {
    trigger = { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: date.getDay() + 1, hour: date.getHours(), minute: date.getMinutes() };
  }
  if (reminder.repeat === "monthly") {
    trigger = { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day: date.getDate(), hour: date.getHours(), minute: date.getMinutes() } as Notifications.NotificationTriggerInput;
  }
  return Notifications.scheduleNotificationAsync({
    identifier: reminder.id,
    content: { title: "Recall reminder", body: reminder.title, data: { reminderId: reminder.id } },
    trigger,
  });
}

export async function cancelReminderNotification(id: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    /* notification may not exist */
  }
}

export async function startLocationReminder(reminder: { id: string; title: string; location?: { latitude: number; longitude: number; radius: number; mode: "arrive" | "leave" } }) {
  if (!reminder.location) return false;
  if (Platform.OS === "web") return false;
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) return false;
  const background = await Location.requestBackgroundPermissionsAsync();
  if (!background.granted) return false;
  const eventType = reminder.location.mode === "arrive" ? Location.GeofencingEventType.Enter : Location.GeofencingEventType.Exit;
  await Location.startGeofencingAsync(GEOFENCE_TASK, [{
    identifier: reminder.id,
    latitude: reminder.location.latitude,
    longitude: reminder.location.longitude,
    radius: reminder.location.radius,
    notifyOnEnter: eventType === Location.GeofencingEventType.Enter,
    notifyOnExit: eventType === Location.GeofencingEventType.Exit,
  }]);
  return true;
}
