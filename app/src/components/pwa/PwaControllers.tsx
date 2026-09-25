// PWA-Lifecycle-Controller — Phase 20 Plan 03 Task 4 (DEPLOY-04).
// Ausgelagert aus app/app/_layout.tsx (Deviation, Rule 2): _layout.tsx importiert
// '../global.css' und zieht Sentry/TanStack-Query/Sync/Invite-Code-Repos mit sich —
// keine dieser Abhaengigkeiten ist unter jsdom ohne erheblichen Mock-Aufwand
// testbar, und Jest hat keinen Transformer fuer CSS-Importe. Diese drei
// Controller brauchen davon nichts; als eigenes Modul sind sie mit
// "Browser-Schnittstellen mocken" (Task-4-Vorgabe) direkt testbar.
//
// - ServiceWorkerController: SW-Registrierung (Plan 20-03 Task 2, T-20-03-01)
//   + Update-Erkennung + Update-Hinweis (SKIP_WAITING, nie waehrend
//   ungesicherter Aenderungen, nie automatisch).
// - InstallPromptController: faengt beforeinstallprompt ab, legt das Ereignis
//   im Auth-Store ab (Banner rendert in app/(app)/settings.tsx).
// - StorageController: navigator.storage.persist() nach Login,
//   navigator.storage.estimate()-Warnbanner ab 80% Quota beim Start.
import * as React from 'react';
import { View, Platform } from 'react-native';
import { InlineBanner } from '@/src/components/InlineBanner';
import { useAuthStore } from '@/src/stores/authStore';
import { useAuth } from '@/src/lib/auth';
import { hasPendingSaves } from '@/src/lib/editor/saveDebounce';
import de from '@spatenstich/shared/i18n/de';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

function canUseServiceWorker(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof location !== 'undefined' &&
    location.protocol === 'https:'
  );
}

/**
 * Registriert /sw.js, erkennt eine wartende neue Version und zeigt einen
 * Update-Hinweis. Aktiviert die neue Version NIE automatisch — nur nach
 * Tap auf die Aktion, und nie waehrend ungesicherter Aenderungen
 * (hasPendingSaves()) — der Hinweis bleibt dann stehen.
 */
export function ServiceWorkerController(): React.JSX.Element | null {
  const [waitingWorker, setWaitingWorker] = React.useState<{
    postMessage: (msg: string) => void;
  } | null>(null);
  const reloadingRef = React.useRef(false);

  React.useEffect(() => {
    if (!canUseServiceWorker()) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration: any) => {
        registration.addEventListener?.('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(registration.waiting ?? installing);
            }
          });
        });
      })
      .catch((err: unknown) => {
        if (__DEV__) console.warn('[pwa] service worker registration failed', err);
      });

    navigator.serviceWorker.addEventListener?.('controllerchange', () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    });
  }, []);

  const handleUpdateAction = React.useCallback(() => {
    // Nie neu laden, solange ungesicherte Aenderungen anstehen — der Hinweis
    // bleibt einfach stehen, statt Daten zu verlieren.
    if (hasPendingSaves()) return;
    waitingWorker?.postMessage('SKIP_WAITING');
  }, [waitingWorker]);

  if (!waitingWorker) return null;

  return (
    <View className="absolute bottom-0 left-0 right-0 z-50" pointerEvents="box-none">
      <InlineBanner
        message={t('pwa.updateAvailable')}
        actionLabel={t('pwa.updateAction')}
        onAction={handleUpdateAction}
        variant="success"
        testID="pwa-update-toast"
      />
    </View>
  );
}

/** Faengt beforeinstallprompt ab und legt es im Auth-Store ab (nicht persistiert). */
export function InstallPromptController(): null {
  const setInstallPrompt = useAuthStore((s) => s.setInstallPrompt);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [setInstallPrompt]);

  return null;
}

/** navigator.storage.persist() nach Login + Quota-Warnbanner (>=80%) beim Start. */
export function StorageController(): React.JSX.Element | null {
  const { identity } = useAuth();
  const [quotaWarning, setQuotaWarning] = React.useState(false);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !identity) return;
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return;
    navigator.storage.persist().catch(() => {});
  }, [identity]);

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return;
    navigator.storage
      .estimate()
      .then(({ usage, quota }) => {
        if (usage != null && quota != null && quota > 0 && usage / quota >= 0.8) {
          setQuotaWarning(true);
        }
      })
      .catch(() => {});
  }, []);

  if (!quotaWarning) return null;

  return (
    <View className="absolute top-0 left-0 right-0 z-50" pointerEvents="box-none">
      <InlineBanner
        message={t('pwa.storageWarning')}
        variant="warning"
        onDismiss={() => setQuotaWarning(false)}
        testID="pwa-storage-warning"
      />
    </View>
  );
}
