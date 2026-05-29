// Phase 09.1 Plan 02: Z-Order button cluster (D-12 Photoshop-style).
// Pattern S2: provenance spread (Pitfall-5 mitigation) — preserves plantSlug/rotateDeg/etc.
// T-09.1-PROVENANCE-LOSS mitigation: always { ...prev, zOrder: newZ }.
// Imports bringToFront/bringForward/sendBackward/sendToBack from zOrder.ts (pure algorithms).

import * as React from 'react';
import { View, Pressable } from 'react-native';
import { ChevronsUp, ChevronUp, ChevronDown, ChevronsDown } from 'lucide-react-native';
import type { PlanElementRow } from '@spatenstich/shared';
import { bringToFront, bringForward, sendBackward, sendToBack } from '@/src/lib/editor/zOrder';
import { useEditorStore } from '@/src/stores/editorStore';

export interface ZOrderButtonsProps {
  elementId: string;
}

export function ZOrderButtons({ elementId }: ZOrderButtonsProps): React.JSX.Element {
  const elements = useEditorStore((s) => s.elements);

  const apply = (compute: (els: PlanElementRow[], id: string) => number) => {
    const newZ = compute(elements, elementId);
    const target = elements.find((e) => e.id === elementId);
    if (!target) return;
    const prev = (target.provenance ?? {}) as Record<string, unknown>;
    // Pattern S2: spread prev to preserve plantSlug/rotateDeg/note/etc. (Pitfall-5)
    useEditorStore.getState().updateElement(elementId, {
      provenance: { ...prev, zOrder: newZ },
    });
  };

  return (
    <View className="flex-row gap-1 mt-2">
      <Pressable
        testID="zorder-front"
        onPress={() => apply(bringToFront)}
        className="p-2 rounded-md border border-stone-300 dark:border-stone-600"
        accessibilityLabel="Ganz nach vorne"
      >
        <ChevronsUp size={18} color="#44403C" />
      </Pressable>
      <Pressable
        testID="zorder-forward"
        onPress={() => apply(bringForward)}
        className="p-2 rounded-md border border-stone-300 dark:border-stone-600"
        accessibilityLabel="Eine Ebene vor"
      >
        <ChevronUp size={18} color="#44403C" />
      </Pressable>
      <Pressable
        testID="zorder-backward"
        onPress={() => apply(sendBackward)}
        className="p-2 rounded-md border border-stone-300 dark:border-stone-600"
        accessibilityLabel="Eine Ebene zurück"
      >
        <ChevronDown size={18} color="#44403C" />
      </Pressable>
      <Pressable
        testID="zorder-back"
        onPress={() => apply(sendToBack)}
        className="p-2 rounded-md border border-stone-300 dark:border-stone-600"
        accessibilityLabel="Ganz nach hinten"
      >
        <ChevronsDown size={18} color="#44403C" />
      </Pressable>
    </View>
  );
}
