/**
 * SankeyDiagram — SVG renderer for the revenue-flow layout.
 * Port of RefinedSankeyView.swift: bezier S-curve bands with a multi-stop
 * gradient, thin pill node bars, and labels. `compact` hides side labels for the
 * small card preview; the full view shows income/outflow side labels.
 */

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { compactMoney } from '@/lib/compact-money';
import { bandGradientStops, type SankeyLayout, type SankeyNode } from '@/lib/sankey';
import { withOpacity } from '@/lib/color';
import { useAppTheme } from '@/theme/theme-context';

function bandPath(srcX: number, tgtX: number, srcTop: number, srcH: number, tgtTop: number, tgtH: number): string {
  const c1 = srcX + (tgtX - srcX) * 0.38;
  const c2 = srcX + (tgtX - srcX) * 0.62;
  const srcBot = srcTop + srcH;
  const tgtBot = tgtTop + tgtH;
  return [
    `M ${srcX} ${srcTop}`,
    `C ${c1} ${srcTop} ${c2} ${tgtTop} ${tgtX} ${tgtTop}`,
    `L ${tgtX} ${tgtBot}`,
    `C ${c2} ${tgtBot} ${c1} ${srcBot} ${srcX} ${srcBot}`,
    'Z',
  ].join(' ');
}

function truncate(label: string, max: number) {
  return label.length > max ? label.slice(0, max - 1) + '…' : label;
}

export function SankeyDiagram({ layout, width, height, compact }: { layout: SankeyLayout; width: number; height: number; compact: boolean }) {
  const theme = useAppTheme();
  const maxColumn = layout.nodes.reduce((m, n) => Math.max(m, n.column), 2);
  const sortedLinks = [...layout.links].sort((a, b) => b.sourceBandHeight - a.sourceBandHeight);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          {sortedLinks.map((l) => (
            <LinearGradient key={l.id} id={`g-${l.id}`} x1={l.sourceX} y1={0} x2={l.targetX} y2={0} gradientUnits="userSpaceOnUse">
              {bandGradientStops(l.color).map((s, i) => (
                <Stop key={i} offset={s.offset} stopColor={s.color} />
              ))}
            </LinearGradient>
          ))}
        </Defs>

        {sortedLinks.map((l) => (
          <Path
            key={l.id}
            d={bandPath(l.sourceX, l.targetX, l.sourceYStart, l.sourceBandHeight, l.targetYStart, l.targetBandHeight)}
            fill={`url(#g-${l.id})`}
            stroke={withOpacity(l.color, 0.12)}
            strokeWidth={0.5}
          />
        ))}

        {layout.nodes.map((n) => (
          <Rect key={n.id} x={n.rect.x + n.rect.width / 2 - 1.75} y={n.rect.y} width={3.5} height={n.rect.height} rx={1.75} fill={withOpacity(n.color, 0.9)} />
        ))}
      </Svg>

      {/* Labels */}
      {layout.nodes.map((n) => (
        <Label key={`lbl-${n.id}`} node={n} viewWidth={width} maxColumn={maxColumn} compact={compact} primary={theme.primaryText} secondary={theme.secondaryText} />
      ))}
    </View>
  );
}

function Label({
  node: n, viewWidth, maxColumn, compact, primary, secondary,
}: {
  node: SankeyNode; viewWidth: number; maxColumn: number; compact: boolean; primary: string; secondary: string;
}) {
  const isFirst = n.column === 0;
  const isLast = n.column === maxColumn;
  const isMiddle = !isFirst && !isLast;
  const midY = n.rect.y + n.rect.height / 2;

  if (isMiddle) {
    return (
      <View style={[styles.midLabel, { left: n.rect.x + n.rect.width / 2 - 45, top: midY - 11 }]} pointerEvents="none">
        <Text numberOfLines={1} style={[styles.midName, { color: primary }]}>{truncate(n.label, 14)}</Text>
        <Text style={[styles.midAmount, { color: n.color }]}>{compactMoney(n.amount)}</Text>
      </View>
    );
  }

  // Side labels only in the full (non-compact) view, and only for tall-enough bars.
  if (compact || n.rect.height < 12) return null;

  const labelW = isFirst ? Math.min(Math.max(n.rect.x - 4, 0), 80) : Math.min(Math.max(viewWidth - (n.rect.x + n.rect.width) - 4, 0), 80);
  const left = isFirst ? 0 : n.rect.x + n.rect.width + 4;
  return (
    <View
      style={[styles.sideLabel, { left, width: labelW, top: midY - 9, alignItems: isFirst ? 'flex-end' : 'flex-start', paddingRight: isFirst ? 4 : 0 }]}
      pointerEvents="none">
      <Text numberOfLines={1} style={[styles.sideName, { color: primary }]}>{truncate(n.label, labelW > 50 ? 12 : 8)}</Text>
      <Text numberOfLines={1} style={[styles.sideAmount, { color: secondary }]}>{compactMoney(n.amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  midLabel: { position: 'absolute', width: 90, alignItems: 'center' },
  midName: { fontSize: 9, fontWeight: '700' },
  midAmount: { fontSize: 8, fontWeight: '600' },
  sideLabel: { position: 'absolute' },
  sideName: { fontSize: 8, fontWeight: '600' },
  sideAmount: { fontSize: 7, fontWeight: '500' },
});
