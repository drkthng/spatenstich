<#
.SYNOPSIS
    Nightly-Backup fuer das Supabase-Projekt (Kap. 7.4 des Masterplans).

.DESCRIPTION
    Erstellt mit pg_dump einen komprimierten Dump des public-Schemas (ohne
    Eigentuemer-Anweisungen, -Fc-Format) in ein konfigurierbares
    Zielverzeichnis, mit Datum im Dateinamen. Danach werden Dumps aelter als
    30 Tage geloescht (Rotation).

    Das Datenbank-Passwort wird ausschliesslich aus dem Windows Credential
    Manager gelesen (per CredRead-P/Invoke, keine zusaetzliche Modul-
    Abhaengigkeit noetig) und niemals als Klartext-Parameter uebergeben oder
    im Repo hinterlegt.

.NOTES
    Passwort im Credential Manager hinterlegen (einmalig, interaktiv):
        cmdkey /generic:spatenstich-db /user:postgres /pass
    (fragt das Passwort interaktiv ab, speichert es NICHT im Klartext im
    Skript oder im Repo)

    Restore-Weg:
        pg_restore --clean --if-exists -d "postgresql://postgres.<ref>@<host>:<port>/postgres" <dump-datei>
    (Passwort wird bei pg_restore interaktiv abgefragt oder ueber PGPASSWORD
    in der Konsolen-Sitzung gesetzt, niemals in einer Datei gespeichert.)
    Vorher IMMER den Migrations-Stand vergleichen (supabase migration list --linked),
    bevor ein Restore in eine laufende Datenbank eingespielt wird.

    Verbindungszeichenfolge (RESEARCH.md Assumption A6 - Pooler-Format nicht
    unabhaengig gegen die aktuelle Supabase-Dokumentation dieser Session
    verifiziert): Host/Port/project-ref stehen als Variablen am Kopf dieses
    Skripts, damit eine Korrektur eine einzige Zeile bleibt.

    Task-Scheduler-Registrierung: taeglich 03:00 Uhr, Aktion "Programm starten",
    Programm powershell.exe, Argumente:
        -NoProfile -ExecutionPolicy Bypass -File "D:\AiProjects\garden-app\scripts\backup-supabase.ps1"
#>

param(
    [string]$TargetDir = 'D:\Backups',
    [int]$RetentionDays = 30,
    [string]$CredentialTarget = 'spatenstich-db',
    [string]$DbUser = 'postgres',
    [string]$ProjectRef = 'vitrqkzxkiqvadqfzrcx',
    [string]$PoolerHost = 'aws-0-eu-central-1.pooler.supabase.com',
    [int]$PoolerPort = 6543
)

$ErrorActionPreference = 'Stop'

# --- pg_dump-Verfuegbarkeit pruefen ---------------------------------------
$pgDump = Get-Command 'pg_dump' -ErrorAction SilentlyContinue
if (-not $pgDump) {
    Write-Error 'Fehler: pg_dump wurde nicht gefunden. Bitte eine lokale PostgreSQL-Installation (inkl. Client-Tools) im PATH bereitstellen.'
    exit 1
}

# --- Datenbank-Passwort aus dem Windows Credential Manager lesen ---------
# CredRead per P/Invoke (advapi32.dll) - keine externe Modul-Abhaengigkeit.
$credSignature = @'
using System;
using System.Runtime.InteropServices;

public static class CredManager {
    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CredRead(string target, uint type, uint reservedFlag, out IntPtr credentialPtr);

    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern void CredFree(IntPtr cred);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public uint Flags;
        public uint Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public uint CredentialBlobSize;
        public IntPtr CredentialBlob;
        public uint Persist;
        public uint AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    public static string ReadSecret(string target) {
        IntPtr credPtr;
        if (!CredRead(target, 1 /* CRED_TYPE_GENERIC */, 0, out credPtr)) {
            return null;
        }
        try {
            CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
            if (cred.CredentialBlobSize == 0) { return string.Empty; }
            byte[] bytes = new byte[cred.CredentialBlobSize];
            Marshal.Copy(cred.CredentialBlob, bytes, 0, (int)cred.CredentialBlobSize);
            return System.Text.Encoding.Unicode.GetString(bytes);
        } finally {
            CredFree(credPtr);
        }
    }
}
'@

if (-not ('CredManager' -as [type])) {
    Add-Type -TypeDefinition $credSignature -ErrorAction Stop
}

$dbSecret = [CredManager]::ReadSecret($CredentialTarget)
if ([string]::IsNullOrWhiteSpace($dbSecret)) {
    Write-Error "Fehler: Kein Eintrag '$CredentialTarget' im Windows Credential Manager gefunden. Einmalig anlegen mit: cmdkey /generic:$CredentialTarget /user:$DbUser /pass"
    exit 1
}

# --- Zielverzeichnis vorbereiten ------------------------------------------
if (-not (Test-Path -Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

$dateStamp = Get-Date -Format 'yyyyMMdd'
$dumpFile = Join-Path -Path $TargetDir -ChildPath "spatenstich-$dateStamp.dump"

# --- Verbindungszeichenfolge (Pooler, siehe Kopfkommentar) ---------------
$connectionString = "postgresql://$DbUser.$ProjectRef`:$dbSecret@$PoolerHost`:$PoolerPort/postgres"

# --- pg_dump ausfuehren -----------------------------------------------------
try {
    & pg_dump $connectionString --schema=public --no-owner -Fc -f $dumpFile
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump beendete sich mit Exit-Code $LASTEXITCODE"
    }
    Write-Output "Backup erfolgreich: $dumpFile"
}
catch {
    Write-Error "Fehler beim Ausfuehren von pg_dump: $($_.Exception.Message)"
    exit 1
}
finally {
    Remove-Variable -Name connectionString -ErrorAction SilentlyContinue
    Remove-Variable -Name dbSecret -ErrorAction SilentlyContinue
}

# --- Rotation: Dumps aelter als $RetentionDays Tage loeschen --------------
$cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $TargetDir -Filter 'spatenstich-*.dump' |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    ForEach-Object {
        Write-Output "Rotation: entferne altes Backup $($_.FullName)"
        Remove-Item -Path $_.FullName -Force
    }
