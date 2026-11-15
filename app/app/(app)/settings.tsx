// Settings screen — Plan 02-04 Task 2-04-03.
// Mode-branched UI:
//   account → email readout + "Abmelden" with inline confirmation expansion
//             (UI-SPEC line 234 — NO Modal)
//   local   → "Account erstellen und Daten übertragen" CTA opening an
//             inline email/password form that calls migrateLocalToAccount
//   null    → renders nothing (guard against early paint)
//
// Logout flow (T-2-04-04 mitigation): after supabase.auth.signOut()
// and useAuth().signOut() we call Sentry.setUser(null) ONLY when the
// DSN env is present (mirrors Plan 01-03's Sentry.init gating).
import * as React from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { tokens } from '@/src/theme/tokens';
import * as Sentry from '@sentry/react-native';
import de from '@spatenstich/shared/i18n/de';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { InlineBanner } from '@/src/components/InlineBanner';
import { useAuth } from '@/src/lib/auth';
import { useAuthStore } from '@/src/stores/authStore';
import { supabase } from '@/src/lib/supabase';
import { migrateLocalToAccount } from '@/src/lib/migrateLocalToAccount';
import { getSyncWorker } from '@/src/lib/sync/SyncWorker';
import { clearLocalAccountData, countUnsyncedChanges } from '@/src/lib/sync/sessionCleanup';
import { t as tv } from '@/src/lib/i18n';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function SettingsScreen(): React.JSX.Element | null {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const installPromptEvent = useAuthStore((s) => s.installPromptEvent);
  const clearInstallPrompt = useAuthStore((s) => s.clearInstallPrompt);
  const { signOut } = useAuth();

  // Installations-Banner (Phase 20 Plan 03 Task 4, DEPLOY-04) — "Spatenstich
  // als App installieren", vorerst hier unter den Einstellungen ("Heute" kommt
  // in Phase 23). Ausblenden, sobald der Anzeigemodus standalone meldet.
  const [isStandalone, setIsStandalone] = React.useState(false);
  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  const showInstallBanner = Platform.OS === 'web' && !!installPromptEvent && !isStandalone;

  const handleInstall = React.useCallback(async () => {
    const promptEvent = installPromptEvent as
      | { prompt: () => void; userChoice?: Promise<unknown> }
      | null;
    if (!promptEvent?.prompt) return;
    promptEvent.prompt();
    try {
      await promptEvent.userChoice;
    } catch {
      // Nutzer hat abgelehnt oder das Ereignis liefert kein userChoice — beides ok.
    } finally {
      clearInstallPrompt();
    }
  }, [installPromptEvent, clearInstallPrompt]);

  // Account mode — email readout + logout confirmation
  const [email, setEmail] = React.useState<string | null>(null);
  const [showConfirmLogout, setShowConfirmLogout] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  // Phase 33 (SYNC3-07): changes the server does not have yet would be lost by signing out.
  const [unsynced, setUnsynced] = React.useState(0);
  const [syncingFirst, setSyncingFirst] = React.useState(false);

  // Local mode — migration form
  const [migEmail, setMigEmail] = React.useState('');
  const [migPassword, setMigPassword] = React.useState('');
  const [migrating, setMigrating] = React.useState(false);
  const [migError, setMigError] = React.useState<string | null>(null);

  // Local mode — inline login form
  const [showLogin, setShowLogin] = React.useState(false);
  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [loggingIn, setLoggingIn] = React.useState(false);
  const [loginError, setLoginError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (mode !== 'account') return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) setEmail(data.user?.email ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const openLogoutConfirm = React.useCallback(async () => {
    try {
      // One last attempt to send what is waiting, then count what is left.
      await Promise.race([
        getSyncWorker().push(),
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);
    } catch {
      // Offline: the count below says what is at stake.
    }
    try {
      setUnsynced(await countUnsyncedChanges());
    } catch {
      setUnsynced(0);
    }
    setShowConfirmLogout(true);
  }, []);

  const handleSyncFirst = React.useCallback(async () => {
    setSyncingFirst(true);
    try {
      await getSyncWorker().retryAllFailed();
    } catch {
      // The count below shows whether it helped.
    } finally {
      try {
        setUnsynced(await countUnsyncedChanges());
      } catch {
        setUnsynced(0);
      }
      setSyncingFirst(false);
    }
  }, []);

  const handleLogoutConfirm = React.useCallback(async () => {
    setLoggingOut(true);
    try {
      await signOut();
      // Nothing of this account stays on the device for whoever signs in next.
      await clearLocalAccountData().catch(() => {});
      useAuthStore.getState().clearAuth();
      if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
        Sentry.setUser(null);
      }
      router.replace('/(auth)' as any);
    } finally {
      setLoggingOut(false);
      setShowConfirmLogout(false);
    }
  }, [signOut, router]);

  const handleLogin = React.useCallback(async () => {
    setLoginError(null);
    setLoggingIn(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (signInError || !data.session) {
        setLoginError(t('auth.login.error_generic'));
        return;
      }
      useAuthStore.getState().setAccountMode(data.session.user.id);
    } catch {
      setLoginError(t('auth.login.error_generic'));
    } finally {
      setLoggingIn(false);
    }
  }, [loginEmail, loginPassword]);

  const handleMigrate = React.useCallback(async () => {
    setMigError(null);
    setMigrating(true);
    try {
      await migrateLocalToAccount({
        email: migEmail.trim(),
        password: migPassword,
      });
      router.replace('/(app)' as any);
    } catch (e) {
      // WR-07: spezifische Error-Map statt identischer Branches.
      // `migration_partial_*` bedeutet: signUp war erfolgreich, aber ein
      // Folge-Schritt (seed garden / copy metadata / vereinsregeln) ist
      // fehlgeschlagen. User darf NICHT die Generic-Meldung sehen
      // (würde suggerieren "Email bereits verwendet"), sondern einen
      // retry-freundlichen Hinweis.
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith('migration_partial_')) {
        setMigError(t('settings.migration.error_partial'));
      } else if (msg.includes('already in account mode')) {
        setMigError(t('settings.migration.error_already_account'));
      } else {
        // T-2-02-02 — never reveal account-exists at signUp step.
        setMigError(t('auth.register.error_generic'));
      }
    } finally {
      setMigrating(false);
    }
  }, [migEmail, migPassword, router]);

  // No mode → render nothing; GuardedStack will redirect to (auth).
  if (!mode) return null;

  if (mode === 'account') {
    return (
      <ScrollView
        className="flex-1 bg-bg"
        contentContainerClassName="p-6 gap-4"
      >
        <Text className="text-2xl font-display font-semibold text-ink">
          {t('more.account.title')}
        </Text>

        {showInstallBanner ? (
          <InlineBanner
            message={t('pwa.installBanner')}
            actionLabel={t('pwa.installAction')}
            onAction={handleInstall}
            variant="success"
            testID="pwa-install-banner"
          />
        ) : null}

        {email ? (
          <View className="gap-1">
            <Text className="text-xs uppercase text-ink-muted">{t('auth.email')}</Text>
            <Text
              selectable
              className="text-base text-ink"
              testID="settings-email"
            >
              {email}
            </Text>
          </View>
        ) : null}

        <Button
          variant="ghost"
          onPress={() => router.push('/(app)/settings/garden' as any)}
          testID="settings-garden-link"
        >
          <Text className="text-ink font-semibold">
            {t('garden.settings_link')}
          </Text>
        </Button>

        <Button
          variant="ghost"
          onPress={() => router.push('/(app)/join-garden' as any)}
          testID="settings-join-garden-link"
        >
          <Text className="text-ink font-semibold">
            {t('more.join.title')}
          </Text>
        </Button>

        <Link href="/(app)/settings/sync" asChild>
          <Pressable
            className="py-3 border-b border-line flex-row items-center justify-between"
            accessibilityRole="button"
            accessibilityLabel={t('settings.sync_status')}
            testID="settings-link-sync"
          >
            <Text className="text-base text-ink font-semibold">
              {t('settings.sync_status')}
            </Text>
            <ChevronRight size={20} color={tokens.color.inkMuted} />
          </Pressable>
        </Link>

        {/* The route list for typed links is generated at build time; a new route is not in it yet. */}
        <Link href={'/(app)/settings/ai' as never} asChild>
          <Pressable
            className="py-3 border-b border-line flex-row items-center justify-between"
            accessibilityRole="button"
            accessibilityLabel={t('settings.ai_link')}
            testID="settings-link-ai"
          >
            <Text className="text-base text-ink font-semibold">
              {t('settings.ai_link')}
            </Text>
            <ChevronRight size={20} color={tokens.color.inkMuted} />
          </Pressable>
        </Link>

        {!showConfirmLogout ? (
          <Button
            variant="ghost"
            onPress={() => void openLogoutConfirm()}
            testID="settings-logout"
          >
            <Text className="text-ink font-semibold">
              {t('settings.logout')}
            </Text>
          </Button>
        ) : (
          <View className="gap-2 p-4 rounded-lg border border-line">
            <Text className="text-base text-ink" testID="settings-logout-message">
              {unsynced === 0
                ? t('settings.logout_confirm')
                : unsynced === 1
                  ? t('settings.logout_unsynced_one')
                  : tv('settings.logout_unsynced_many', { n: unsynced })}
            </Text>
            {unsynced > 0 ? (
              <Button
                variant="outline"
                onPress={() => void handleSyncFirst()}
                disabled={syncingFirst || loggingOut}
                testID="settings-logout-sync-first"
              >
                <Text className="text-ink font-semibold">
                  {syncingFirst ? t('common.loading') : t('settings.logout_sync_first')}
                </Text>
              </Button>
            ) : null}
            <View className="flex-row gap-2">
              <Button
                variant="destructive"
                onPress={handleLogoutConfirm}
                disabled={loggingOut}
                testID="settings-logout-confirm"
                className="flex-1"
              >
                <Text className="text-on-primary font-semibold">
                  {loggingOut
                    ? t('common.loading')
                    : unsynced > 0
                      ? t('settings.logout_anyway')
                      : t('settings.logout_yes')}
                </Text>
              </Button>
              <Button
                variant="outline"
                onPress={() => setShowConfirmLogout(false)}
                disabled={loggingOut}
                testID="settings-logout-cancel"
                className="flex-1"
              >
                <Text className="text-ink font-semibold">
                  {t('common.cancel')}
                </Text>
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    );
  }

  // mode === 'local' — Migration CTA + inline form
  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="p-6 gap-4"
    >
      <Text className="text-2xl font-display font-semibold text-ink">
        {t('auth.choice.create_account')}
      </Text>

      {showInstallBanner ? (
        <InlineBanner
          message={t('pwa.installBanner')}
          actionLabel={t('pwa.installAction')}
          onAction={handleInstall}
          variant="success"
          testID="pwa-install-banner"
        />
      ) : null}

      <Text className="text-sm text-ink-muted">
        {t('settings.migration.intro')}
      </Text>

      <View className="gap-2">
        <Label nativeID="mig-email-label">{t('auth.email')}</Label>
        <Input
          value={migEmail}
          onChangeText={setMigEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          testID="settings-migrate-email"
          accessibilityLabelledBy="mig-email-label"
        />
      </View>

      <View className="gap-2">
        <Label nativeID="mig-password-label">{t('auth.password')}</Label>
        <Input
          value={migPassword}
          onChangeText={setMigPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          testID="settings-migrate-password"
          accessibilityLabelledBy="mig-password-label"
        />
      </View>

      {migError ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-sm text-danger"
        >
          {migError}
        </Text>
      ) : null}

      <Button
        onPress={handleMigrate}
        disabled={migrating || !migEmail || !migPassword}
        testID="settings-migrate-submit"
      >
        <Text className="text-on-primary font-semibold">
          {migrating ? t('common.loading') : t('settings.migration.cta')}
        </Text>
      </Button>

      <View className="mt-6 pt-6 border-t border-line gap-2">
        <Text className="text-sm text-ink-muted">
          {t('settings.login_existing_desc')}
        </Text>
        {!showLogin ? (
          <Button
            variant="outline"
            onPress={() => setShowLogin(true)}
            testID="settings-login-existing"
          >
            <Text className="text-ink font-semibold">
              {t('settings.login_existing')}
            </Text>
          </Button>
        ) : (
          <View className="gap-2 p-4 rounded-lg border border-line">
            <View className="gap-2">
              <Label nativeID="login-email-label">{t('auth.email')}</Label>
              <Input
                value={loginEmail}
                onChangeText={setLoginEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                testID="settings-login-email"
                accessibilityLabelledBy="login-email-label"
              />
            </View>

            <View className="gap-2">
              <Label nativeID="login-password-label">{t('auth.password')}</Label>
              <Input
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                testID="settings-login-password"
                accessibilityLabelledBy="login-password-label"
              />
            </View>

            {loginError ? (
              <Text
                accessibilityLiveRegion="polite"
                className="text-sm text-danger"
              >
                {loginError}
              </Text>
            ) : null}

            <View className="flex-row gap-2">
              <Button
                onPress={handleLogin}
                disabled={loggingIn || !loginEmail || !loginPassword}
                testID="settings-login-submit"
                className="flex-1"
              >
                <Text className="text-on-primary font-semibold">
                  {loggingIn ? t('common.loading') : t('auth.login.submit')}
                </Text>
              </Button>
              <Button
                variant="outline"
                onPress={() => setShowLogin(false)}
                disabled={loggingIn}
                testID="settings-login-cancel"
                className="flex-1"
              >
                <Text className="text-ink font-semibold">
                  {t('common.cancel')}
                </Text>
              </Button>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
