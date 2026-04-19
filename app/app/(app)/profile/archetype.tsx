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
    label: 'Selbstversorger',
    description: 'Maximaler Ertrag, viele Beete, intensive Nutzung',
  },
  {
    archetype: ARCHETYPES.FAMILIE,
    label: 'Familien-Naschgarten',
    description: 'Kindgerecht, robuste Sorten, viel Naschobst',
  },
  {
    archetype: ARCHETYPES.MIX,
    label: 'Mix ausgewogen',
    description: 'Gleichgewicht aus Nutzgarten, Zier- und Erholungsbereich',
  },
  {
    archetype: ARCHETYPES.ZIER,
    label: 'Zier- & Erholungsgarten',
    description: 'Sitzplatz, Stauden, dekorative Gestaltung im Vordergrund',
  },
  {
    archetype: ARCHETYPES.BIODIVERSITAET,
    label: 'Biodiversitäts- / Naturgarten',
    description: 'Wildblumen, Insektenfreundlich, möglichst naturnah',
  },
  {
    archetype: ARCHETYPES.KRAEUTER,
    label: 'Kräuter- / Apothekergarten',
    description: 'Heil- und Küchenkräuter, kompakte Hochbeete',
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
      className="flex-1 bg-stone-50 dark:bg-stone-900"
      contentContainerClassName="flex-grow p-6 gap-4"
    >
      <Text className="text-xl font-semibold text-stone-900 dark:text-stone-100">
        Wähle deinen Garten-Stil
      </Text>
      <Text className="text-sm text-stone-600 dark:text-stone-300">
        Der Archetyp beeinflusst Pflanzenvorschläge und die Flächenverteilung im Plan.
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
        <Text className="text-white font-semibold">
          {saving ? t('common.loading') : t('profile.archetype.submit')}
        </Text>
      </Button>
    </ScrollView>
  );
}
