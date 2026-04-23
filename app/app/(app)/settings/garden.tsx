// Mein Garten — Plan 02.5-04.
// Pattern: settings.tsx (inline-confirmation-expansion) + profile/plz.tsx (form).
// Features (SC-1..SC-4 + D-16 Owner-Rights):
//   - Garden-Name (read-only, edit deferred)
//   - Members list with display_name + Owner-Badge + Remove-Button (owner only)
//   - Invite-Code: create (owner), display, Copy + Share buttons
//   - Leave-Garden (member)
//   - D-16: Besitzer-Status abgeben (owner → wählt Member → transferOwnership)
//   - D-16: Garten löschen (owner only, disabled wenn members > 1)
//   - LWW label: "zuletzt bearbeitet von <Name>, <time>"
import * as React from 'react';
import { View, Text, ScrollView, Share } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import de from '@spatenstich/shared/i18n/de';
import { Button } from '@/src/components/ui/button';
import { useAuthStore } from '@/src/stores/authStore';
import {
  loadGarden,
  loadMembers,
  removeMember,
  leaveGarden,
  deleteGarden,
  transferOwnership,
  NotOwnerError,
  GardenHasMembersError,
  CannotTransferToSelfError,
  TargetNotMemberError,
} from '@/src/lib/gardenRepo';
import { createInviteForGarden } from '@/src/lib/inviteCodeRepo';
import type { Garden, GardenMember } from '@spatenstich/shared';

const t = (key: string, vars?: Record<string, string | number>): string => {
  const raw =
    key.split('.').reduce<any>((o, k) => (o ? o[k] : undefined), de as any) ?? key;
  if (typeof raw !== 'string' || !vars) return raw;
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, String(v)),
    raw
  );
};

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return t('audit.time_just_now');
  if (diffH < 1) return t('audit.time_minutes_ago', { n: diffMin });
  if (diffH < 24) return t('audit.time_hours_ago', { n: diffH });
  return t('audit.time_days_ago', { n: diffD });
}

export default function GardenSettingsScreen(): React.JSX.Element | null {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const userId = useAuthStore((s) => s.userId);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);
  const setActiveGarden = useAuthStore((s) => s.setActiveGarden);

  const [garden, setGarden] = React.useState<Garden | null>(null);
  const [members, setMembers] = React.useState<GardenMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [code, setCode] = React.useState<string | null>(null);
  const [creatingCode, setCreatingCode] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = React.useState(false);

  // D-16 state
  const [transferExpanded, setTransferExpanded] = React.useState(false);
  const [transferring, setTransferring] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (mode !== 'account' || !activeGardenId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [g, m] = await Promise.all([
          loadGarden(mode, activeGardenId),
          loadMembers(mode, activeGardenId),
        ]);
        if (!cancelled) {
          setGarden(g);
          setMembers(m);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, activeGardenId]);

  if (mode !== 'account') {
    return (
      <View className="flex-1 bg-stone-50 dark:bg-stone-900 p-6">
        <Text className="text-stone-700 dark:text-stone-200">
          {t('garden.local_mode_notice')}
        </Text>
      </View>
    );
  }

  const isOwner =
    !!userId && members.some((m) => m.userId === userId && m.role === 'owner');
  const otherMembers = members.filter((m) => m.userId !== userId);
  const canDelete = isOwner && members.length <= 1;

  const handleCreateInvite = async (): Promise<void> => {
    if (!activeGardenId) return;
    setCreatingCode(true);
    setError(null);
    try {
      const newCode = await createInviteForGarden('account', activeGardenId);
      setCode(newCode);
    } catch (e) {
      // WR-06: 23514-Branch entfernt — create_invite_for_garden kann kein
      // check_violation werfen (nur INSERT auf invite_codes ohne CHECK).
      // Der "garden already full"-Fall wird serverseitig über den neuen
      // P9006 SQLSTATE gemeldet (Migration 007+). UI-Gating via
      // `members.length < 2` (Zeile 329) ist die primäre Defense.
      const err = e as { code?: string };
      if (err.code === '42501') setError(t('garden.invite.error_not_owner'));
      else if (err.code === 'P9006')
        setError(t('garden.invite.error_already_full'));
      else setError(t('garden.invite.error_generic'));
    } finally {
      setCreatingCode(false);
    }
  };

  const handleCopy = async (): Promise<void> => {
    if (code) await Clipboard.setStringAsync(code);
  };

  const handleShare = async (): Promise<void> => {
    if (!code) return;
    try {
      await Share.share({
        message: t('garden.invite.share_message', { code }),
      });
    } catch {
      // silent — user canceled
    }
  };

  const handleRemoveMember = async (memberUserId: string): Promise<void> => {
    if (!activeGardenId) return;
    try {
      await removeMember('account', activeGardenId, memberUserId);
      setMembers((prev) => prev.filter((m) => m.userId !== memberUserId));
      setConfirmRemove(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleLeaveGarden = async (): Promise<void> => {
    if (!activeGardenId || !userId) return;
    try {
      await leaveGarden('account', activeGardenId, userId);
      setActiveGarden(null);
      router.replace('/(app)' as any);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // D-16: Transfer ownership to a member
  const handleTransferOwnership = async (toUserId: string): Promise<void> => {
    if (!activeGardenId || !userId) return;
    setError(null);
    setTransferring(toUserId);
    try {
      await transferOwnership('account', activeGardenId, toUserId);
      // Success: refresh member list (roles swapped), collapse the transfer UI.
      const refreshed = await loadMembers('account', activeGardenId);
      setMembers(refreshed);
      setTransferExpanded(false);
      // Intentionally stay on this screen: user is now a "member" and can see the new owner badge.
    } catch (e) {
      if (e instanceof NotOwnerError) setError(t('errors.not_owner'));
      else if (e instanceof CannotTransferToSelfError)
        setError(t('garden.transferOwnership.error_self'));
      else if (e instanceof TargetNotMemberError)
        setError(t('garden.transferOwnership.error_target_not_member'));
      else setError(t('garden.transferOwnership.error_generic'));
    } finally {
      setTransferring(null);
    }
  };

  // D-16: Delete garden (only when sole member remaining)
  const handleDeleteGarden = async (): Promise<void> => {
    if (!activeGardenId) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteGarden('account', activeGardenId);
      // Success: clear active garden and navigate back to auth (user has no garden now).
      // The root _layout bootstrap useEffect (D-12) will re-resolve a new default garden
      // on next auth-group entry via ensure_default_garden_for_user.
      setActiveGarden(null);
      router.replace('/(auth)' as any);
    } catch (e) {
      if (e instanceof GardenHasMembersError)
        setError(t('garden.delete.error_has_members'));
      else if (e instanceof NotOwnerError) setError(t('errors.not_owner'));
      else setError(t('garden.delete.error_generic'));
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-stone-50 dark:bg-stone-900 p-6 items-center justify-center">
        <Text className="text-stone-600 dark:text-stone-300">
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  if (!garden) {
    return (
      <View className="flex-1 bg-stone-50 dark:bg-stone-900 p-6">
        <Text
          className="text-red-600 dark:text-red-400"
          testID="settings-garden-error"
        >
          {error ?? t('garden.not_found')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-stone-50 dark:bg-stone-900"
      contentContainerClassName="flex-grow p-6 gap-4"
    >
      <Text className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
        {garden.name}
      </Text>
      {garden.plz ? (
        <Text className="text-sm text-stone-600 dark:text-stone-300">
          {t('garden.plz_label')}: {garden.plz}
        </Text>
      ) : null}
      {garden.updatedByUserId && garden.updatedAt ? (
        <Text
          className="text-xs text-stone-500"
          testID="settings-garden-lww-label"
        >
          {t('audit.last_edited_by', {
            name:
              members.find((m) => m.userId === garden.updatedByUserId)
                ?.displayName ?? '?',
            time: formatRelative(garden.updatedAt),
          })}
        </Text>
      ) : null}

      {/* Members */}
      <View className="gap-2 mt-4">
        <Text className="text-xs uppercase text-stone-500">
          {t('garden.members_title')}
        </Text>
        {members.map((m, idx) => (
          <View
            key={m.userId}
            className="flex-row items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-stone-700"
            testID={`settings-garden-member-${idx}`}
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-base text-stone-900 dark:text-stone-100">
                {m.displayName ?? '?'}
              </Text>
              <Text
                className={`text-xs px-2 py-0.5 rounded ${
                  m.role === 'owner'
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-stone-200 text-stone-700'
                }`}
              >
                {m.role === 'owner'
                  ? t('garden.owner_badge')
                  : t('garden.member_badge')}
              </Text>
            </View>
            {isOwner && m.userId !== userId ? (
              confirmRemove === m.userId ? (
                <View className="flex-row gap-2">
                  <Button
                    variant="destructive"
                    onPress={() => handleRemoveMember(m.userId)}
                    testID={`settings-garden-member-remove-confirm-${idx}`}
                  >
                    <Text className="text-white">{t('common.confirm')}</Text>
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => setConfirmRemove(null)}
                  >
                    <Text>{t('common.cancel')}</Text>
                  </Button>
                </View>
              ) : (
                <Button
                  variant="ghost"
                  onPress={() => setConfirmRemove(m.userId)}
                  testID={`settings-garden-member-remove-${idx}`}
                >
                  <Text className="text-red-600">{t('garden.member.remove')}</Text>
                </Button>
              )
            ) : null}
          </View>
        ))}
      </View>

      {/* Invite — owner only, member count < 2 */}
      {isOwner && members.length < 2 ? (
        <View className="gap-2 mt-4">
          {!code ? (
            <Button
              onPress={handleCreateInvite}
              disabled={creatingCode}
              testID="settings-garden-invite-btn"
            >
              <Text className="text-white font-semibold">
                {creatingCode ? t('common.loading') : t('garden.invite.create')}
              </Text>
            </Button>
          ) : (
            <View
              className="gap-2 p-4 rounded-lg border border-stone-200 dark:border-stone-700"
              testID="settings-garden-code-display"
            >
              <Text className="text-xs uppercase text-stone-500">
                {t('garden.invite.code_display_title')}
              </Text>
              <Text
                className="text-3xl font-mono tracking-widest text-stone-900 dark:text-stone-100"
                testID="settings-garden-code-value"
              >
                {code}
              </Text>
              <Text className="text-xs text-stone-500">
                {t('garden.invite.expires_in_hours')}
              </Text>
              <View className="flex-row gap-2">
                <Button
                  variant="outline"
                  onPress={handleCopy}
                  testID="settings-garden-copy-btn"
                >
                  <Text>{t('garden.invite.copy')}</Text>
                </Button>
                <Button
                  variant="outline"
                  onPress={handleShare}
                  testID="settings-garden-share-btn"
                >
                  <Text>{t('garden.invite.share')}</Text>
                </Button>
              </View>
            </View>
          )}
        </View>
      ) : null}

      {/* Leave — member only (non-owner) */}
      {!isOwner && members.some((m) => m.userId === userId) ? (
        !confirmLeave ? (
          <Button
            variant="outline"
            onPress={() => setConfirmLeave(true)}
            testID="settings-garden-leave-btn"
          >
            <Text className="text-red-600">{t('garden.member.leave')}</Text>
          </Button>
        ) : (
          <View className="gap-2 p-4 rounded-lg border border-stone-200 dark:border-stone-700">
            <Text className="text-base text-stone-900 dark:text-stone-100">
              {t('garden.member.leave_confirm')}
            </Text>
            <View className="flex-row gap-2">
              <Button
                variant="destructive"
                onPress={handleLeaveGarden}
                testID="settings-garden-leave-confirm"
              >
                <Text className="text-white">{t('common.confirm')}</Text>
              </Button>
              <Button
                variant="outline"
                onPress={() => setConfirmLeave(false)}
              >
                <Text>{t('common.cancel')}</Text>
              </Button>
            </View>
          </View>
        )
      ) : null}

      {/* D-16: Transfer ownership — owner only, at least one other member */}
      {isOwner && otherMembers.length >= 1 ? (
        <View className="gap-2 mt-6 pt-4 border-t border-stone-200 dark:border-stone-700">
          <Text className="text-xs uppercase text-stone-500">
            {t('garden.owner_badge')}
          </Text>
          {!transferExpanded ? (
            <Button
              variant="outline"
              onPress={() => setTransferExpanded(true)}
              testID="settings-garden-transfer-btn"
            >
              <Text className="text-amber-700 dark:text-amber-400">
                {t('garden.transferOwnership.button')}
              </Text>
            </Button>
          ) : (
            <View className="gap-2 p-4 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-950">
              <Text className="text-base text-stone-900 dark:text-stone-100">
                {t('garden.transferOwnership.confirm')}
              </Text>
              {/* Target-member select list (one-tap-to-transfer, no extra confirm step — the expanded panel IS the confirm) */}
              {otherMembers.map((m, idx) => (
                <Button
                  key={m.userId}
                  variant="destructive"
                  onPress={() => handleTransferOwnership(m.userId)}
                  disabled={transferring !== null}
                  testID={`settings-garden-transfer-target-${idx}`}
                >
                  <Text className="text-white">
                    {transferring === m.userId
                      ? t('common.loading')
                      : `${t('common.confirm')}: ${m.displayName ?? '?'}`}
                  </Text>
                </Button>
              ))}
              <Button
                variant="outline"
                onPress={() => setTransferExpanded(false)}
                disabled={transferring !== null}
              >
                <Text>{t('common.cancel')}</Text>
              </Button>
            </View>
          )}
        </View>
      ) : null}

      {/* D-16: Delete garden — owner only, disabled if other members exist */}
      {isOwner ? (
        <View className="gap-2 mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
          {!confirmDelete ? (
            <>
              <Button
                variant="destructive"
                onPress={() => setConfirmDelete(true)}
                disabled={!canDelete}
                testID="settings-garden-delete-btn"
              >
                <Text className="text-white font-semibold">
                  {t('garden.delete.button')}
                </Text>
              </Button>
              {!canDelete ? (
                <Text
                  className="text-xs text-stone-500"
                  testID="settings-garden-delete-disabled-hint"
                >
                  {t('garden.delete.disabledHint')}
                </Text>
              ) : null}
            </>
          ) : (
            <View className="gap-2 p-4 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950">
              <Text className="text-base text-red-900 dark:text-red-100 font-semibold">
                {t('garden.delete.warning')}
              </Text>
              <View className="flex-row gap-2">
                <Button
                  variant="destructive"
                  onPress={handleDeleteGarden}
                  disabled={deleting}
                  testID="settings-garden-delete-confirm"
                >
                  <Text className="text-white">
                    {deleting ? t('common.loading') : t('garden.delete.confirm_cta')}
                  </Text>
                </Button>
                <Button
                  variant="outline"
                  onPress={() => setConfirmDelete(false)}
                  disabled={deleting}
                  testID="settings-garden-delete-cancel"
                >
                  <Text>{t('garden.delete.cancel')}</Text>
                </Button>
              </View>
            </View>
          )}
        </View>
      ) : null}

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-sm text-red-600 dark:text-red-400"
          testID="settings-garden-error"
        >
          {error}
        </Text>
      ) : null}
    </ScrollView>
  );
}
