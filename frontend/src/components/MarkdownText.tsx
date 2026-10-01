import { Text, View } from "react-native";
import { useTheme } from "@/src/theme";

type Token = { kind: "text" } | { kind: "bold" } | { kind: "italic" } | { kind: "code" };

function renderInline(line: string, color: string, keyBase: string) {
  // Tokenize **bold**, *italic*, `code`
  const parts: { text: string; style: Token["kind"] }[] = [];
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) parts.push({ text: line.slice(last, m.index), style: "text" });
    if (m[2] !== undefined) parts.push({ text: m[2], style: "bold" });
    else if (m[4] !== undefined) parts.push({ text: m[4], style: "italic" });
    else if (m[6] !== undefined) parts.push({ text: m[6], style: "code" });
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push({ text: line.slice(last), style: "text" });
  if (parts.length === 0) parts.push({ text: line, style: "text" });

  return parts.map((part, index) => {
    const style: Record<string, string | number> = { color };
    if (part.style === "bold") style.fontWeight = "700";
    if (part.style === "italic") style.fontStyle = "italic";
    if (part.style === "code") { style.fontFamily = "Courier"; style.backgroundColor = "rgba(200,90,50,0.10)"; }
    return <Text key={`${keyBase}-${index}`} style={style}>{part.text}</Text>;
  });
}

export function MarkdownText({ source }: { source: string }) {
  const { colors } = useTheme();
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuffer: { ordered: boolean; items: string[] } | null = null;

  function flushList() {
    if (!listBuffer) return;
    const current = listBuffer;
    blocks.push(
      <View key={`list-${blocks.length}`} style={{ marginVertical: 6, gap: 4 }}>
        {current.items.map((text, idx) => (
          <View key={idx} style={{ flexDirection: "row", gap: 8 }}>
            <Text style={{ color: colors.brandPrimary, fontSize: 15, lineHeight: 23 }}>
              {current.ordered ? `${idx + 1}.` : "•"}
            </Text>
            <Text style={{ flex: 1, color: colors.onSurface, fontSize: 15, lineHeight: 23 }}>
              {renderInline(text, colors.onSurface, `li-${blocks.length}-${idx}`)}
            </Text>
          </View>
        ))}
      </View>,
    );
    listBuffer = null;
  }

  lines.forEach((raw, i) => {
    const line = raw.replace(/\s+$/, "");
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);

    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const sizes = { 1: 24, 2: 20, 3: 17 } as const;
      blocks.push(
        <Text
          key={`h-${i}`}
          style={{
            color: colors.onSurface,
            fontFamily: "Georgia",
            fontWeight: "500",
            fontSize: sizes[level as 1 | 2 | 3],
            lineHeight: sizes[level as 1 | 2 | 3] * 1.3,
            marginTop: level === 1 ? 14 : 10,
            marginBottom: 4,
          }}
        >
          {renderInline(text, colors.onSurface, `h-${i}`)}
        </Text>,
      );
    } else if (bulletMatch) {
      if (!listBuffer || listBuffer.ordered) { flushList(); listBuffer = { ordered: false, items: [] }; }
      listBuffer.items.push(bulletMatch[1]);
    } else if (orderedMatch) {
      if (!listBuffer || !listBuffer.ordered) { flushList(); listBuffer = { ordered: true, items: [] }; }
      listBuffer.items.push(orderedMatch[1]);
    } else if (!line.trim()) {
      flushList();
      blocks.push(<View key={`sp-${i}`} style={{ height: 8 }} />);
    } else {
      flushList();
      blocks.push(
        <Text key={`p-${i}`} style={{ color: colors.onSurface, fontSize: 15, lineHeight: 23, marginVertical: 2 }}>
          {renderInline(line, colors.onSurface, `p-${i}`)}
        </Text>,
      );
    }
  });

  flushList();
  return <View testID="markdown-body">{blocks}</View>;
}
