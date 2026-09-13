<#
.SYNOPSIS
    Supabase Keep-alive-Ping fuer den Windows Task Scheduler (24/7-PC).

.DESCRIPTION
    Fragt die REST-Schnittstelle des Supabase-Projekts auf die Pflanzentabelle ab
    (ein Feld, Limit 1), damit das kostenlose Supabase-Projekt nicht wegen
    Inaktivitaet pausiert wird. Ergaenzt den GitHub-Actions-Zeitplan
    (supabase-keepalive.yml), der nach 60 Tagen Repo-Inaktivitaet selbst
    pausiert (siehe README.md "Betrieb").

.PARAMETER
    Keine Parameter. URL und Anon-Key werden ausschliesslich aus den
    Umgebungsvariablen SPATENSTICH_SUPABASE_URL und
    SPATENSTICH_SUPABASE_ANON_KEY gelesen, niemals im Skript hinterlegt.

.NOTES
    Registrierung im Windows Task Scheduler (taeglich):
        1. Aufgabenplanung oeffnen -> "Aufgabe erstellen"
        2. Trigger: taeglich, z. B. 07:00 Uhr
        3. Aktion: Programm starten
             Programm/Skript: powershell.exe
             Argumente: -NoProfile -ExecutionPolicy Bypass -File "D:\AiProjects\garden-app\scripts\keepalive.ps1"
        4. Unter "Bedingungen": "Nur starten, wenn Netzwerkverbindung verfuegbar" aktivieren
        5. Umgebungsvariablen SPATENSTICH_SUPABASE_URL und SPATENSTICH_SUPABASE_ANON_KEY
           muessen im Systemkontext gesetzt sein (System -> Erweiterte Systemeinstellungen ->
           Umgebungsvariablen), damit der Task Scheduler sie auch ausserhalb einer
           interaktiven Sitzung sieht.

    Log-Datei: scripts\keepalive.log (im selben Verzeichnis wie dieses Skript).
#>

$ErrorActionPreference = 'Stop'

$LogFile = Join-Path -Path $PSScriptRoot -ChildPath 'keepalive.log'

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $LogFile -Value "[$timestamp] $Message"
}

$SupabaseUrl = $env:SPATENSTICH_SUPABASE_URL
$AnonKey = $env:SPATENSTICH_SUPABASE_ANON_KEY

if ([string]::IsNullOrWhiteSpace($SupabaseUrl) -or [string]::IsNullOrWhiteSpace($AnonKey)) {
    $msg = 'Fehler: SPATENSTICH_SUPABASE_URL und/oder SPATENSTICH_SUPABASE_ANON_KEY sind nicht gesetzt. Bitte als Umgebungsvariablen im Systemkontext hinterlegen (siehe Kopfkommentar dieses Skripts).'
    Write-Log $msg
    Write-Error $msg
    exit 1
}

$Uri = "$SupabaseUrl/rest/v1/plants?select=slug&limit=1"

try {
    $null = Invoke-RestMethod -Uri $Uri -Method Get -Headers @{
        'apikey'        = $AnonKey
        'Authorization' = "Bearer $AnonKey"
    } -TimeoutSec 30
    Write-Log 'Erfolg: Supabase-REST-Anfrage beantwortet.'
    exit 0
}
catch {
    $msg = "Fehler: Supabase-Keep-alive-Anfrage fehlgeschlagen - $($_.Exception.Message)"
    Write-Log $msg
    Write-Error $msg
    exit 1
}
