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
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Link } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import de from '@spatenstich/shared/i18n/de';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { useAuth } from '@/src/lib/auth';
import { useAuthStore } from '@/src/stores/authStore';
import { supabase } from '@/src/lib/supabase';
import { migrateLocalToAccount } from '@/src/lib/migrateLocalToAccount';

const t = (key: string): string =>
  key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;

export default function SettingsScreen(): React.JSX.Element | null {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const { signOut } = useAuth();

  // Account mode — email readout + logout confirmation
  const [email, setEmail] = React.useState<string | null>(null);
  const [showConfirmLogout, setShowConfirmLogout] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

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

  const handleLogoutConfirm = React.useCallback(async () => {
    setLoggingOut(true);
    try {
      await signOut();
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
        className="flex-1 bg-stone-50 dark:bg-stone-900"
        contentContainerClassName="p-6 gap-4"
      >
        <Text className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Konto
        </Text>

        {email ? (
          <View className="gap-1">
            <Text className="text-xs uppercase text-stone-500">E-Mail</Text>
            <Text
              selectable
              className="text-base text-stone-900 dark:text-stone-100"
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
          <Text className="text-stone-700 dark:text-stone-200 font-semibold">
            {t('garden.settings_link')}
          </Text>
        </Button>

        <Button
          variant="ghost"
          onPress={() => router.push('/(app)/join-garden' as any)}
          testID="settings-join-garden-link"
        >
          <Text className="text-stone-700 dark:text-stone-200 font-semibold">
            Garten beitreten
          </Text>
        </Button>

        <Link href="/(app)/settings/privacy" asChild>
          <Pressable
            className="py-3 border-b border-stone-200 dark:border-stone-800 flex-row items-center justify-between"
            accessibilityRole="button"
            accessibilityLabel="Datenschutz"
            testID="settings-privacy-link"
          >
            <Text className="text-base text-stone-700 dark:text-stone-200 font-semibold">
              Datenschutz
            </Text>
            <Text className="text-stone-400">›</Text>
          </Pressable>
        </Link>

        <Link href="/(app)/settings/sync" asChild>
          <Pressable
            className="py-3 border-b border-stone-200 dark:border-stone-800 flex-row items-center justify-between"
            accessibilityRole="button"
            accessibilityLabel="Sync-Status"
            testID="settings-link-sync"
          >
            <Text className="text-base text-stone-700 dark:text-stone-200 font-semibold">
              Sync-Status
            </Text>
            <Text className="text-stone-400">›</Text>
          </Pressable>
        </Link>

        {!showConfirmLogout ? (
          <Button
            variant="ghost"
            onPress={() => setShowConfirmLogout(true)}
            testID="settings-logout"
          >
            <Text className="text-stone-700 dark:text-stone-200 font-semibold">
              {t('settings.logout')}
            </Text>
          </Button>
        ) : (
          <View className="gap-2 p-4 rounded-lg border border-stone-200 dark:border-stone-700">
            <Text className="text-base text-stone-900 dark:text-stone-100">
              {t('settings.logout_confirm')}
            </Text>
            <View className="flex-row gap-2">
              <Button
                variant="destructive"
                onPress={handleLogoutConfirm}
                disabled={loggingOut}
                testID="settings-logout-confirm"
                className="flex-1"
              >
                <Text className="text-white font-semibold">
                  {loggingOut ? t('common.loading') : 'Ja, abmelden'}
                </Text>
              </Button>
              <Button
                variant="outline"
                onPress={() => setShowConfirmLogout(false)}
                disabled={loggingOut}
                testID="settings-logout-cancel"
                className="flex-1"
              >
                <Text className="text-stone-900 dark:text-stone-100 font-semibold">
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
      className="flex-1 bg-stone-50 dark:bg-stone-900"
      contentContainerClassName="p-6 gap-4"
    >
      <Text className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
        Account erstellen
      </Text>
      <Text className="text-sm text-stone-600 dark:text-stone-300">
        Übertrage deine Daten (PLZ, Archetyp, Vereinsregeln) in einen Account,
        damit sie auf anderen Geräten verfügbar sind.
      </Text>

      <View className="gap-2">
        <Label nativeID="mig-email-label">E-Mail</Label>
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
        <Label nativeID="mig-password-label">Passwort</Label>
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
          className="text-sm text-red-600 dark:text-red-400"
        >
          {migError}
        </Text>
      ) : null}

      <Button
        onPress={handleMigrate}
        disabled={migrating || !migEmail || !migPassword}
        testID="settings-migrate-submit"
      >
        <Text className="text-white font-semibold">
          {migrating ? t('common.loading') : t('settings.migration.cta')}
        </Text>
      </Button>

      <View className="mt-6 pt-6 border-t border-stone-200 dark:border-stone-700 gap-2">
        <Text className="text-sm text-stone-600 dark:text-stone-300">
          {t('settings.login_existing_desc')}
        </Text>
        {!showLogin ? (
          <Button
            variant="outline"
            onPress={() => setShowLogin(true)}
            testID="settings-login-existing"
          >
            <Text className="text-stone-700 dark:text-stone-200 font-semibold">
              {t('settings.login_existing')}
            </Text>
          </Button>
        ) : (
          <View className="gap-2 p-4 rounded-lg border border-stone-200 dark:border-stone-700">
            <View className="gap-2">
              <Label nativeID="login-email-label">E-Mail</Label>
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
              <Label nativeID="login-password-label">Passwort</Label>
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
                className="text-sm text-red-600 dark:text-red-400"
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
                <Text className="text-white font-semibold">
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
                <Text className="text-stone-900 dark:text-stone-100 font-semibold">
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
