import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { LogBox, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { LinksProvider } from "@/src/links/LinksContext";
import { hasOnboarded } from "@/src/links/storage";
import { themes } from "@/src/theme";
import "@/src/links/notifications";

const brandSurface = themes.light.surface;

SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ fade: true, duration: 400 });

LogBox.ignoreAllLogs(true);

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

type OnboardingState = {
  onboarded: boolean;
  setOnboarded: (value: boolean) => void;
};
const OnboardingContext = createContext<OnboardingState | null>(null);

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error("useOnboarding must be used inside OnboardingGate");
  return value;
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    hasOnboarded()
      .then((flag) => setOnboarded(flag))
      .catch(() => setOnboarded(true))
      .finally(() => {
        setReady(true);
        SplashScreen.hideAsync().catch(() => undefined);
      });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const inOnboarding = segments[0] === "onboarding";
    if (!onboarded && !inOnboarding) router.replace("/onboarding");
    else if (onboarded && inOnboarding) router.replace("/");
  }, [ready, onboarded, segments, router]);

  const value = useMemo<OnboardingState>(() => ({ onboarded, setOnboarded }), [onboarded]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: brandSurface }} />;
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <KeyboardProvider>
          <LinksProvider>
            <OnboardingGate>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: brandSurface } }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: "fade" }} />
                <Stack.Screen name="add" options={{ presentation: "modal" }} />
                <Stack.Screen name="reminder" options={{ presentation: "modal" }} />
                <Stack.Screen name="item/[id]" />
              </Stack>
            </OnboardingGate>
          </LinksProvider>
        </KeyboardProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
