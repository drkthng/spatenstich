// GardenPlanView — static SVG plan renderer for confirmed garden elements.
// Phase 4 Plan 04 — D-09 sketch-warm style, PHOTO-06 schematic 2D plan.
// No touch interaction (Phase 4 is read-only; interactivity comes in Phase 5).
import * as React from 'react';
import { Dimensions as RNDimensions } from 'react-native';
import Svg, { Rect, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import type { GardenDimensionsRow, PlanElementRow } from '@spatenstich/shared';

/** Plan Rendering Colors — UI-SPEC D-09, sketch-warm palette. */
const PLAN_COLORS: Record<string, string> = {
  background: '#F5F0E8',
  border: '#8B7355',
  Rasen: '#8DB580',
  Beet: '#C4956A',
  Weg: '#D4C5A9',
  Laube: '#A0785A',
  Kompost: '#7A6148',
  Wasserstelle: '#7EB5C4',
  Zaun: '#8B7355',
  Baum: '#6B9B5E',
  Sitzplatz: '#C9B99A',
  Sonstiges: '#B8AFA7',
  grid: '#D6CFC4',
};

/** Darken a hex color by a factor (for strokes). */
function darkenColor(hex: string, factor = 0.2): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * (1 - factor));
  const dg = Math.round(g * (1 - factor));
  const db = Math.round(b * (1 - factor));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

/** Truncate label to max length. */
function truncateLabel(label: string, maxLen = 10): string {
  return label.length > maxLen ? label.substring(0, maxLen - 1) + '\u2026' : label;
}

export interface GardenPlanViewProps {
  dimensions: GardenDimensionsRow;
  elements: PlanElementRow[];
  showGrid: boolean;
  testID?: string;
}

export function GardenPlanView({
  dimensions,
  elements,
  showGrid,
  testID,
}: GardenPlanViewProps): React.JSX.Element {
  const SVG_PADDING = 32;
  const screenWidth = RNDimensions.get('window').width - SVG_PADDING * 2;
  const scale = screenWidth / dimensions.widthM;
  const svgWidth = screenWidth;
  const svgHeight = dimensions.heightM * scale;

  // Font size scaled to garden coordinates
  const labelFontSize = Math.max(10, Math.min(14, 14 / (dimensions.widthM / 10)));
  const dimFontSize = labelFontSize;

  return (
    <Svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      accessibilityLabel={`Schematischer Gartenplan mit ${elements.length} Elementen`}
      testID={testID}
    >
      {/* 1. Background */}
      <Rect
        x={0}
        y={0}
        width={svgWidth}
        height={svgHeight}
        fill={PLAN_COLORS.background}
      />

      {/* 2. Garden boundary — dashed stroke for organic/hand-drawn feel */}
      <Rect
        x={1}
        y={1}
        width={svgWidth - 2}
        height={svgHeight - 2}
        fill="none"
        stroke={PLAN_COLORS.border}
        strokeWidth={2}
        strokeDasharray="6 3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3. Grid overlay (1m intervals) */}
      {showGrid ? (
        <G opacity={0.4}>
          {/* Vertical lines at 1m intervals */}
          {Array.from({ length: Math.floor(dimensions.widthM) - 1 }, (_, i) => {
            const x = (i + 1) * scale;
            return (
              <Line
                key={`v-${i}`}
                x1={x}
                y1={0}
                x2={x}
                y2={svgHeight}
                stroke={PLAN_COLORS.grid}
                strokeWidth={0.5}
              />
            );
          })}
          {/* Horizontal lines at 1m intervals */}
          {Array.from({ length: Math.floor(dimensions.heightM) - 1 }, (_, i) => {
            const y = (i + 1) * scale;
            return (
              <Line
                key={`h-${i}`}
                x1={0}
                y1={y}
                x2={svgWidth}
                y2={y}
                stroke={PLAN_COLORS.grid}
                strokeWidth={0.5}
              />
            );
          })}
        </G>
      ) : null}

      {/* 4. Elements */}
      {elements.map((el) => {
        const fill = PLAN_COLORS[el.elementType] ?? PLAN_COLORS.Sonstiges;
        const stroke = darkenColor(fill);
        const cx = el.xM * scale;
        const cy = el.yM * scale;

        // Special: Baum → Circle
        if (el.elementType === 'Baum') {
          const radius = (el.widthM / 2) * scale;
          return (
            <G key={el.id}>
              <Circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={fill}
                opacity={0.7}
                stroke={stroke}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <SvgText
                x={cx}
                y={cy + labelFontSize / 3}
                textAnchor="middle"
                fontSize={labelFontSize}
                fill={PLAN_COLORS.border}
              >
                {truncateLabel(el.label)}
              </SvgText>
            </G>
          );
        }

        // Special: Zaun → Line (dashed)
        if (el.elementType === 'Zaun') {
          const x1 = (el.xM - el.widthM / 2) * scale;
          const x2 = (el.xM + el.widthM / 2) * scale;
          const y1 = el.yM * scale;
          return (
            <G key={el.id}>
              <Line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y1}
                stroke={fill}
                strokeWidth={2}
                strokeDasharray="4 2"
                strokeLinecap="round"
              />
              <SvgText
                x={(x1 + x2) / 2}
                y={y1 - 4}
                textAnchor="middle"
                fontSize={labelFontSize}
                fill={PLAN_COLORS.border}
              >
                {truncateLabel(el.label)}
              </SvgText>
            </G>
          );
        }

        // Default: positioned Rect (center-based positioning to top-left)
        const rectX = (el.xM - el.widthM / 2) * scale;
        const rectY = (el.yM - el.heightM / 2) * scale;
        const rectW = el.widthM * scale;
        const rectH = el.heightM * scale;

        return (
          <G key={el.id}>
            <Rect
              x={rectX}
              y={rectY}
              width={rectW}
              height={rectH}
              fill={fill}
              opacity={0.7}
              stroke={stroke}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              rx={3}
              ry={3}
            />
            <SvgText
              x={rectX + rectW / 2}
              y={rectY + rectH / 2 + labelFontSize / 3}
              textAnchor="middle"
              fontSize={labelFontSize}
              fill={PLAN_COLORS.border}
            >
              {truncateLabel(el.label)}
            </SvgText>
          </G>
        );
      })}

      {/* 5. Dimension labels along boundary */}
      {/* Bottom edge — width */}
      <SvgText
        x={svgWidth / 2}
        y={svgHeight - 6}
        textAnchor="middle"
        fontSize={dimFontSize}
        fill={PLAN_COLORS.border}
      >
        {`${dimensions.widthM} m`}
      </SvgText>
      {/* Left edge — height (rotated text not well-supported in RN SVG, use vertical position) */}
      <SvgText
        x={12}
        y={svgHeight / 2}
        textAnchor="middle"
        fontSize={dimFontSize}
        fill={PLAN_COLORS.border}
        rotation={-90}
        originX={12}
        originY={svgHeight / 2}
      >
        {`${dimensions.heightM} m`}
      </SvgText>
    </Svg>
  );
}
