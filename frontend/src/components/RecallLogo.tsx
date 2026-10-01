import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/src/theme";

/**
 * Editorial Recall mark: a soft crescent (the "recall arc") cradling a serif R.
 * No remote assets, no SVG — pure View composition so it works everywhere.
 */
export function RecallLogo({ size = 44 }: { size?: number }) {
  const { colors } = useTheme();
  const stroke = Math.max(2, size * 0.07);
  const letter = size * 0.55;
  return (
    <View
      testID="recall-logo"
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.brandTertiary,
        },
      ]}
    >
      <View
        style={{
          position: "absolute",
          width: size * 0.84,
          height: size * 0.84,
          borderRadius: size * 0.42,
          borderWidth: stroke,
          borderColor: colors.brandPrimary,
          borderRightColor: "transparent",
          borderBottomColor: "transparent",
          transform: [{ rotate: "40deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size * 0.14,
          height: size * 0.14,
          borderRadius: size * 0.07,
          backgroundColor: colors.brandPrimary,
          top: size * 0.1,
          right: size * 0.12,
        }}
      />
      <Text
        style={{
          color: colors.brandPrimary,
          fontSize: letter,
          fontFamily: "Georgia",
          fontWeight: "500",
          lineHeight: letter * 1.05,
          marginTop: size * 0.04,
        }}
      >
        R
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
