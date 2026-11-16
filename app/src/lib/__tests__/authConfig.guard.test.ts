/**
 * The sign-in settings of the live project come from supabase/config.toml
 * (`supabase config push`, see docs/betrieb/anmeldung.md). This test keeps the file and the app
 * in step, so that a later push cannot break sign-up or the password reset.
 *
 * Found on 2026-11-16: the live service sent reset codes with eight digits, the reset screen
 * accepts six. Nobody could have reset a password.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../../..');
const read = (file: string): string => fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');

/** The lines of one table of the TOML file, comments left out. */
function section(toml: string, name: string): string {
  const start = toml.indexOf(`\n[${name}]\n`);
  if (start < 0) throw new Error(`[${name}] is missing in supabase/config.toml`);
  const rest = toml.slice(start + name.length + 4);
  const end = rest.search(/^\[/m);
  return (end < 0 ? rest : rest.slice(0, end))
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');
}

function value(sectionText: string, key: string): string {
  const m = new RegExp("^" + key + "[ \t]*=[ \t]*(.+)$", "m").exec(sectionText);
  if (!m) throw new Error(`${key} is missing`);
  return m[1].trim();
}

describe('sign-in settings in supabase/config.toml', () => {
  const toml = read('supabase/config.toml');
  const email = section(toml, 'auth.email');

  it('sends reset codes as long as the reset screen accepts', () => {
    const screen = read('app/app/(auth)/reset-verify.tsx');
    const accepted = /maxLength=\{(\d+)\}/.exec(screen);
    expect(accepted).not.toBeNull();
    expect(value(email, 'otp_length')).toBe(accepted![1]);
    expect(read('packages/shared/src/i18n/de.json')).toContain('sechsstelligen Code');
    expect(accepted![1]).toBe('6');
  });

  it('lets a new account in without a confirmation mail', () => {
    expect(value(email, 'enable_confirmations')).toBe('false');
  });

  it('sends the reset mail with the code and without a link', () => {
    const recovery = section(toml, 'auth.email.template.recovery');
    const file = value(recovery, 'content_path').replace(/^"|"$/g, '');
    const mail = read(file);
    expect(mail).toContain('{{ .Token }}');
    expect(mail).not.toContain('ConfirmationURL');
    expect(mail).not.toMatch(/<a\s/i);
  });

  it('points to the delivered app, not to a local address', () => {
    const auth = section(toml, 'auth');
    expect(value(auth, 'site_url')).toBe('"https://spatenstich.pages.dev"');
    expect(value(auth, 'additional_redirect_urls')).toContain('https://spatenstich.pages.dev/**');
  });
});
