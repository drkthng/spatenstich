# Anmeldung: Einstellungen des Anmeldedienstes

Die Einstellungen für Registrierung, Anmeldung und Passwort-Reset stehen in `supabase/config.toml` im Abschnitt `[auth]` und werden von dort auf das Supabase-Projekt übertragen. Das Dashboard zeigt denselben Stand; wer dort etwas ändert, trägt es auch in die Datei ein, sonst nimmt die nächste Übertragung es zurück.

## Was gilt (Stand 2026-11-16)

| Einstellung | Wert | Warum |
|---|---|---|
| `[auth.email] enable_confirmations` | `false` | Ein neues Konto ist sofort angemeldet, ohne Bestätigungs-E-Mail. Sonst hängt die Registrierung in der installierten App an einem Link, der im Browser aufgeht. |
| `[auth.email] otp_length` | `6` | Der Bildschirm „Passwort zurücksetzen“ nimmt genau sechs Ziffern. Bis 2026-11-16 stand der Dienst auf acht; ein Reset wäre nicht möglich gewesen. |
| `[auth.email.template.recovery]` | `supabase/templates/recovery.html` | Die E-Mail zum Zurücksetzen nennt den Code (`{{ .Token }}`) und enthält keinen Link. |
| `site_url`, `additional_redirect_urls` | `https://spatenstich.pages.dev` | Adresse der ausgelieferten App. |
| `enable_signup` | `true` | Registrierung ist offen, bis beide Konten bestehen (siehe unten). |

Der Test `app/src/lib/__tests__/authConfig.guard.test.ts` hält Datei und App zusammen: Länge des Codes, keine Bestätigungs-E-Mail, Code statt Link, Adresse der App.

## Ändern

Im Repository, mit angemeldeter Supabase CLI:

```bash
# 1. Ansehen, was sich ändern würde, ohne etwas zu ändern (jede Frage mit n beantworten)
supabase config push

# 2. Nur wenn der gezeigte Unterschied genau die gewollte Änderung ist: noch einmal, mit y
supabase config push
```

Der Befehl zeigt für jeden Bereich den Unterschied zwischen Projekt und Datei und fragt dann. Steht im Unterschied mehr als gewollt (zum Beispiel eine lokale Adresse bei `site_url`), mit `n` abbrechen und erst die Datei berichtigen. Mit `--yes` wird ohne Nachfrage übertragen; nicht verwenden.

Prüfen, ohne angemeldet zu sein: `https://<projekt>.supabase.co/auth/v1/settings` mit dem öffentlichen Schlüssel nennt `mailer_autoconfirm` (wahr heißt: keine Bestätigungs-E-Mail) und `disable_signup`.

## Registrierung schließen

Die App läuft privat für einen Haushalt, das Impressum nennt deshalb weder Name noch Anschrift. Das trägt nur, solange sich niemand Fremdes registrieren kann. Sobald beide Konten bestehen:

1. In `supabase/config.toml` im Abschnitt `[auth]` (nicht `[auth.email]`) `enable_signup = false` setzen.
2. Übertragen wie oben. Der Unterschied darf nur diese eine Zeile zeigen.

Anmelden, Passwort-Reset und der Beitritt mit Einladungscode für bestehende Konten gehen weiter. Soll später ein weiteres Konto dazukommen, die Zeile für die Registrierung kurz zurückstellen.
