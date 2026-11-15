// Impressum and version (Phase 38, DESIGN3-08). A route outside the signed-in and the sign-in
// areas, so it can be read in both states: from "Mehr" and from the start screen.
import * as React from 'react';
import { ImprintContent } from '@/src/components/legal/LegalScreens';
import { LegalFrame } from '@/src/components/legal/LegalFrame';

export default function ImprintScreen(): React.JSX.Element {
  return (
    <LegalFrame titleKey="more.imprint.title">
      <ImprintContent />
    </LegalFrame>
  );
}
