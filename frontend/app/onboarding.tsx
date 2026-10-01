import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Animated, Dimensions, FlatList, Pressable, StyleSheet, Text, View, type ViewToken } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RecallLogo } from "@/src/components/RecallLogo";
import { markOnboarded } from "@/src/links/storage";
import { useOnboarding } from "@/app/_layout";
import { makeStyles, useTheme } from "@/src/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Slide = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  icon: keyof typeof Feather.glyphMap;
};

const slides: Slide[] = [
  { key: "welcome", eyebrow: "WELCOME TO", title: "A calm place for\nthings worth keeping.", body: "Recall is a quiet, private archive for the links, notes, and thoughts you want to find again.", icon: "bookmark" },
  { key: "capture", eyebrow: "CAPTURE ANYTHING", title: "Links, notes, lists,\nimages, voice.", body: "Save from the Android Sharesheet, paste a URL, jot a quick thought, or tap record. Everything lives in one place.", icon: "plus-circle" },
  { key: "reminders", eyebrow: "GENTLE NUDGES", title: "Nudges that know\ntime and place.", body: "Set reminders for a specific moment, a recurring day, or when you arrive somewhere. Your phone handles the alert.", icon: "bell" },
  { key: "privacy", eyebrow: "PRIVATE BY DESIGN", title: "Only your phone\nknows.", body: "No account. No cloud. Nothing leaves this device. Export to JSON or Markdown anytime you like.", icon: "shield" },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useStyles();
  const { setOnboarded } = useOnboarding();
  const listRef = useRef<FlatList<Slide> | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first && typeof first.index === "number") setIndex(first.index);
  }).current;

  function next() {
    if (index < slides.length - 1) {
      const nextIndex = index + 1;
      listRef.current?.scrollToOffset({ offset: nextIndex * SCREEN_WIDTH, animated: true });
      setIndex(nextIndex);
    } else {
      void finish();
    }
  }

  async function finish() {
    await markOnboarded();
    setOnboarded(true);
    router.replace("/");
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
        <RecallLogo size={34} />
        <Pressable testID="onboarding-skip" onPress={() => void finish()} style={styles.skip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <Animated.FlatList
        ref={(ref) => { listRef.current = ref as unknown as FlatList<Slide> | null; }}
        data={slides}
        keyExtractor={(slide) => slide.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i })}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item, index: i }) => <SlideView slide={item} scrollX={scrollX} indexPos={i} colors={colors} styles={styles} />}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => {
            const inputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];
            const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: "clamp" });
            const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: "clamp" });
            return <Animated.View key={i} testID={`onboarding-dot-${i}`} style={[styles.dot, { width: dotWidth, opacity }]} />;
          })}
        </View>
        <Pressable testID="onboarding-next" onPress={next} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
          <Text style={styles.ctaText}>{index === slides.length - 1 ? "Open Recall" : "Next"}</Text>
          <Feather name={index === slides.length - 1 ? "check" : "arrow-right"} size={18} color={colors.onBrandPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

function SlideView({ slide, scrollX, indexPos, colors, styles }: { slide: Slide; scrollX: Animated.Value; indexPos: number; colors: ReturnType<typeof useTheme>["colors"]; styles: ReturnType<typeof useStyles> }) {
  const inputRange = [(indexPos - 1) * SCREEN_WIDTH, indexPos * SCREEN_WIDTH, (indexPos + 1) * SCREEN_WIDTH];
  const translateY = scrollX.interpolate({ inputRange, outputRange: [40, 0, 40], extrapolate: "clamp" });
  const opacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: "clamp" });

  return (
    <View style={{ width: SCREEN_WIDTH }}>
      <Animated.View style={[styles.slide, { opacity, transform: [{ translateY }] }]}>
        <View style={styles.illustrationFrame}>
          <View style={styles.illustrationHalo} />
          <View style={styles.illustrationCircle}>
            <Feather name={slide.icon} size={62} color={colors.brandPrimary} />
          </View>
        </View>
        <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  skip: { minWidth: 44, minHeight: 44, alignItems: "flex-end", justifyContent: "center" },
  skipText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  slide: { flex: 1, paddingHorizontal: 32, alignItems: "flex-start", justifyContent: "center" },
  illustrationFrame: { width: 200, height: 200, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 42 },
  illustrationHalo: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: colors.brandTertiary, opacity: 0.9 },
  illustrationCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  eyebrow: { color: colors.brandPrimary, fontSize: 11, letterSpacing: 1.4, fontWeight: "800", marginBottom: 11 },
  title: { color: colors.onSurface, fontSize: 32, lineHeight: 40, fontFamily: "Georgia", fontWeight: "500" },
  body: { color: colors.onSurfaceSecondary, fontSize: 15, lineHeight: 23, marginTop: 15, maxWidth: 320 },
  footer: { paddingHorizontal: 20, gap: 20 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: { height: 8, borderRadius: 4, backgroundColor: colors.brandPrimary },
  cta: { minHeight: 56, borderRadius: 28, backgroundColor: colors.brandPrimary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  ctaText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.8 },
}));
