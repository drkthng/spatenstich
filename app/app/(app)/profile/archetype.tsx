// Archetyp-Auswahl — 2-column grid of 6 ArchetypeCards.
// Pattern: 02-UI-SPEC.md §"Archetyp-Auswahl". Selection persists via useProfile.setArchetype.
import * as React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import de from '@spatenstich/shared/i18n/de';
import { ARCHETYPES, type Archetype } from '@spatenstich/shared';
import { ArchetypeCard } from '@/src/components/ArchetypeCard';
import { Button } from '@/src/components/ui/button';
import { useProfile } from '@/src/hooks/useProfile';
import { t as tx } from '@/src/lib/i18n';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

interface ArchetypeOption {
  archetype: Archetype;
  label: string;
  description: string;
}

// Order matches 02-02-PLAN §C: selbstversorger → familien_naschgarten → mix_ausgewogen → zier_erholung → biodiversitaet → kraeuter_apotheker.
const ARCHETYPE_OPTIONS: readonly ArchetypeOption[] = [
  {
    archetype: ARCHETYPES.SELBSTVERSORGER,
    label: tx('profile.archetypes.selbstversorger.label'),
    description: tx('profile.archetypes.selbstversorger.description'),
  },
  {
    archetype: ARCHETYPES.FAMILIE,
    label: tx('profile.archetypes.familien_naschgarten.label'),
    description: tx('profile.archetypes.familien_naschgarten.description'),
  },
  {
    archetype: ARCHETYPES.MIX,
    label: tx('profile.archetypes.mix_ausgewogen.label'),
    description: tx('profile.archetypes.mix_ausgewogen.description'),
  },
  {
    archetype: ARCHETYPES.ZIER,
    label: tx('profile.archetypes.zier_erholung.label'),
    description: tx('profile.archetypes.zier_erholung.description'),
  },
  {
    archetype: ARCHETYPES.BIODIVERSITAET,
    label: tx('profile.archetypes.biodiversitaet.label'),
    description: tx('profile.archetypes.biodiversitaet.description'),
  },
  {
    archetype: ARCHETYPES.KRAEUTER,
    label: tx('profile.archetypes.kraeuter_apotheker.label'),
    description: tx('profile.archetypes.kraeuter_apotheker.description'),
  },
] as const;

export default function ArchetypeScreen(): React.JSX.Element {
  const router = useRouter();
  const { archetype: stored, setArchetype } = useProfile();
  const [selected, setSelected] = React.useState<Archetype | null>(stored);
  const [saving, setSaving] = React.useState(false);

  const onSubmit = async (): Promise<void> => {
    if (!selected) return;
    setSaving(true);
    try {
      await setArchetype(selected);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="flex-grow p-6 gap-4"
    >
      <Text className="text-xl font-display font-semibold text-ink">
        {tx('profile.archetype.title')}
      </Text>
      <Text className="text-sm text-ink-muted">
        {tx('profile.archetype.intro')}
      </Text>

      <View className="flex-row flex-wrap gap-4">
        {ARCHETYPE_OPTIONS.map((opt) => (
          <View key={opt.archetype} className="w-[48%]">
            <ArchetypeCard
              archetype={opt.archetype}
              label={opt.label}
              description={opt.description}
              selected={selected === opt.archetype}
              onSelect={() => setSelected(opt.archetype)}
            />
          </View>
        ))}
      </View>

      <Button onPress={onSubmit} disabled={!selected || saving} testID="archetype-submit">
        <Text className="text-on-primary font-semibold">
          {saving ? t('common.loading') : t('profile.archetype.submit')}
        </Text>
      </Button>
    </ScrollView>
  );
}
