import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FAF8F5", onSurface: "#1C1B18", surfaceSecondary: "#F3EFEA", onSurfaceSecondary: "#4A4741",
  surfaceTertiary: "#EAE4DC", onSurfaceTertiary: "#6B665E", surfaceInverse: "#1C1B18", onSurfaceInverse: "#FAF8F5",
  muted: "#7A756D", brand: "#C85A32", onBrand: "#FAF8F5", brandPrimary: "#C85A32", onBrandPrimary: "#FAF8F5",
  brandSecondary: "#E07A5F", onBrandSecondary: "#FAF8F5", brandTertiary: "#F4DCD5", onBrandTertiary: "#7A2E12",
  success: "#2D6A4F", onSuccess: "#F0FDF4", warning: "#B45309", onWarning: "#FFFBEB", error: "#991B1B",
  onError: "#FEF2F2", info: "#1E3A8A", onInfo: "#EFF6FF", border: "#E6DFD5", borderStrong: "#C85A32", divider: "#EFEAE2",
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