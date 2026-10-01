import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { LogBox } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { LinksProvider } from "@/src/links/LinksContext";
import "@/src/links/notifications";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true);

// Suppress the Expo Go SDK 53+ console error about Android remote push notifications.
// Recall only uses *local* scheduled notifications (fully supported in Expo Go);
// the message is informational and refers to remote push which the app does not use.
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const PUSH_NOTICE = /Android Push notifications \(remote notifications\) functionality provided by expo-notifications was removed/i;
console.error = (...args: unknown[]) => {
  if (args.some((entry) => typeof entry === "string" && PUSH_NOTICE.test(entry))) return;
  originalConsoleError(...(args as []));
};
console.warn = (...args: unknown[]) => {
  if (args.some((entry) => typeof entry === "string" && PUSH_NOTICE.test(entry))) return;
  originalConsoleWarn(...(args as []));
};

export default function RootLayout() {
  // One app level ErrorBoundary; a render crash shows a reload screen
  // instead of a blank app.
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <KeyboardProvider>
          <LinksProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="add" options={{ presentation: "modal" }} />
              <Stack.Screen name="reminder" options={{ presentation: "modal" }} />
              <Stack.Screen name="item/[id]" />
            </Stack>
          </LinksProvider>
        </KeyboardProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
