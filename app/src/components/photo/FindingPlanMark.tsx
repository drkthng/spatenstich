// Phase 35 (PHOTO-08): a small still picture of the plan that shows what a finding is
// about. The picture is cut to the surroundings of the spot, so the thing in question is
// large enough to recognise; the element is drawn in the selection colour, a proposed
// size or place dashed, a new plant as a ring. Web DOM SVG, like the editor.

import * as React from 'react';
import type { GardenDimensionsRow, PlanElementRow } from '@spatenstich/shared';
import { elementPolygon } from '@/src/lib/editor/outline';
import type { FindingMark } from '@/src/lib/photo/findings';
import { viewFor } from '@/src/lib/photo/markView';
import { elementFill, tokens } from '@/src/theme/tokens';

export interface FindingPlanMarkProps {
  dimensions: GardenDimensionsRow;
  elements: PlanElementRow[];
  mark: FindingMark;
  /** Read out instead of the picture. */
  label: string;
  testID?: string;
}

const HEIGHT_PX = 180;
function points(polygon: { x: number; y: number }[]): string {
  return polygon.map((p) => `${p.x},${p.y}`).join(' ');
}

export function FindingPlanMark({ dimensions, elements, mark, label, testID }: FindingPlanMarkProps): React.JSX.Element | null {
  if (mark.type === 'none') return null;
  const live = elements.filter((e) => e.deletedAt === null);
  const { widthM, heightM } = dimensions;
  if (!(widthM > 0) || !(heightM > 0)) return null;

  const view = viewFor(mark, live, { widthM, heightM });
  // Stroke widths and text in metres, relative to what is shown, so they look the same
  // whatever the size of the garden.
  const unit = Math.max(view.width, view.height) / 180;
  const pad = unit * 4;
  const marked = mark.type === 'element' ? mark.elementId : null;
  const box = mark.type === 'box' ? mark : mark.type === 'element' && mark.proposed ? mark.proposed : null;
  const fontSize = unit * 9;

  return (
    <svg
      role="img"
      aria-label={label}
      data-testid={testID}
      data-mark={mark.type}
      width="100%"
      height={HEIGHT_PX}
      viewBox={`${view.x - pad} ${view.y - pad} ${view.width + 2 * pad} ${view.height + 2 * pad}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', background: tokens.plan.bg }}
    >
      <rect x={0} y={0} width={widthM} height={heightM} fill="none" stroke={tokens.plan.border} strokeWidth={unit * 1.2} />
      {live.map((el) => {
        const isMarked = el.id === marked;
        return (
          <polygon
            key={el.id}
            points={points(elementPolygon(el))}
            fill={elementFill(el.elementType)}
            fillOpacity={isMarked ? 0.9 : tokens.plan.fillOpacity}
            stroke={isMarked ? tokens.color.select : tokens.plan.stroke}
            strokeWidth={isMarked ? unit * 2.2 : unit * 0.6}
            data-marked={isMarked ? 'true' : undefined}
          />
        );
      })}
      {/* Names of the fixed things, to find one's way; plants would only clutter. */}
      {live
        .filter((el) => el.elementType !== 'Pflanze' && el.label && el.widthM >= fontSize * 2.5)
        .map((el) => (
          <text
            key={`label-${el.id}`}
            x={el.xM}
            y={el.yM + fontSize * 0.35}
            fontSize={fontSize}
            textAnchor="middle"
            fill={tokens.plan.label}
            stroke={tokens.plan.labelHalo}
            strokeWidth={fontSize * 0.25}
            paintOrder="stroke"
            fontFamily={tokens.font.body}
            style={{ pointerEvents: 'none' }}
          >
            {el.label.length > 18 ? `${el.label.slice(0, 17)}…` : el.label}
          </text>
        ))}
      {box ? (
        <rect
          x={box.xM - box.widthM / 2}
          y={box.yM - box.heightM / 2}
          width={box.widthM}
          height={box.heightM}
          fill={tokens.color.select}
          fillOpacity={0.12}
          stroke={tokens.color.select}
          strokeWidth={unit * 2}
          strokeDasharray={`${unit * 5} ${unit * 3}`}
          data-proposed="true"
        />
      ) : null}
      {mark.type === 'spot' ? (
        <g data-spot="true">
          <circle cx={mark.xM} cy={mark.yM} r={unit * 9} fill="none" stroke={tokens.color.select} strokeWidth={unit * 2} />
          <circle cx={mark.xM} cy={mark.yM} r={unit * 2.5} fill={tokens.color.select} />
        </g>
      ) : null}
    </svg>
  );
}
