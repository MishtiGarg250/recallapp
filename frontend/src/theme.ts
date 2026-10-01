import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FDFBF7", onSurface: "#2C2A29", surfaceSecondary: "#F5F1EB", onSurfaceSecondary: "#4A4745",
  surfaceTertiary: "#EAE4DC", onSurfaceTertiary: "#6B6764", surfaceInverse: "#1C1A19", onSurfaceInverse: "#FDFBF7",
  muted: "#7A7570", brand: "#8C5E3C", onBrand: "#FFFFFF", brandPrimary: "#8C5E3C", onBrandPrimary: "#FFFFFF",
  brandSecondary: "#A67B5B", onBrandSecondary: "#FFFFFF", brandTertiary: "#D6C7B8", onBrandTertiary: "#2C2A29",
  success: "#3B6D51", onSuccess: "#FFFFFF", warning: "#8C6A3C", onWarning: "#FFFFFF", error: "#9E3C3C",
  onError: "#FFFFFF", info: "#3C5E8C", onInfo: "#FFFFFF", border: "#E2DBD1", borderStrong: "#C8BEB2", divider: "#E8E2D8",
};

export type ThemeColors = typeof light;
export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) { Appearance.setColorScheme?.(scheme ?? "unspecified"); }
setColorScheme(defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system === "dark" && themes.dark ? "dark" : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}