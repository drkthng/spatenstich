// Datenschutz (Phase 38, DESIGN3-08). A route outside the signed-in and the sign-in
// areas, so it can be read in both states: from "Mehr" and from the start screen.
import * as React from 'react';
import { PrivacyContent } from '@/src/components/legal/LegalScreens';
import { LegalFrame } from '@/src/components/legal/LegalFrame';

export default function PrivacyScreen(): React.JSX.Element {
  return (
    <LegalFrame titleKey="more.privacy.title">
      <PrivacyContent />
    </LegalFrame>
  );
}
