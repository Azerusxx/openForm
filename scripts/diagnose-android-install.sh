#!/usr/bin/env bash
# Diagnose Android installation problems without uninstalling openForm or deleting app data.
# Run on a Linux computer with Android platform-tools (adb) and USB debugging enabled:
#   bash scripts/diagnose-android-install.sh /path/to/app-debug.apk
#   bash scripts/diagnose-android-install.sh /path/to/app-debug.apk --install
# The optional --install performs a normal update ONLY; no downgrade, no data wipe.
set -euo pipefail

PKG="app.openform.personal.test"
APK="${1:-}"
ACTION="${2:-}"

if [[ -z "$APK" || ! -f "$APK" ]]; then
  echo "Usage: bash $0 /path/to/app-debug.apk [--install]" >&2
  exit 2
fi
if [[ -n "$ACTION" && "$ACTION" != "--install" ]]; then
  echo "Only --install is accepted; the default is read-only inspection." >&2
  exit 2
fi
if ! command -v adb >/dev/null 2>&1; then
  echo "Android platform-tools (adb) missing. Install android-sdk-platform-tools." >&2
  exit 2
fi

echo "== File =="
echo "Path: $APK"
sha256sum "$APK"
if command -v unzip >/dev/null 2>&1; then
  unzip -tq "$APK" >/dev/null || { echo "APK ZIP integrity FAILED"; exit 1; }
  echo "APK ZIP integrity: OK"
fi
if command -v apksigner >/dev/null 2>&1; then
  apksigner verify --verbose --print-certs "$APK" | grep -E 'Verifies|Signer #1 certificate SHA-256 digest|Verified using' || {
    echo "APK signature could not be verified."
    exit 1
  }
else
  echo "Optional: apksigner not in PATH; APK signature verification skipped."
fi
if command -v aapt >/dev/null 2>&1; then
  aapt dump badging "$APK" | grep -m1 '^package:' || true
fi

echo "== Connected Android devices =="
adb devices -l
devices=$(adb devices | awk 'NR>1 && $2=="device" {n++} END {print n+0}')
if [[ "$devices" -ne 1 ]]; then
  echo "Exactly one authorized device is required (found $devices)." >&2
  exit 2
fi

echo "== Existing app (read only) =="
if adb shell pm path "$PKG" | grep -q '^package:'; then
  adb shell dumpsys package "$PKG" | tr -d '\r' | grep -m 12 -E '^\s*(versionCode|versionName|firstInstallTime|lastUpdateTime|Signing|signatures|SigningDetails):' || true
  echo "Existing app found. It will NOT be removed."
else
  echo "Package $PKG not installed under this user, or Android did not expose it."
fi

if [[ "$ACTION" != "--install" ]]; then
  echo
  echo "Read-only inspection complete. For a non-destructive update attempt:"
  echo "bash $0 \"$APK\" --install"
  exit 0
fi

echo "== Android installer result =="
echo "Performing a normal upgrade (-r). No uninstall, no data reset, no downgrade."
set +e
result=$(adb install -r -t "$APK" 2>&1)
status=$?
set -e
printf '%s\n' "$result"
if [[ "$status" -ne 0 ]]; then
  echo
  case "$result" in
    *INSTALL_FAILED_UPDATE_INCOMPATIBLE*|*INSTALL_FAILED_SHARED_USER_INCOMPATIBLE*)
      echo "DIAGNOSIS: Existing package and new APK have incompatible signing identities. Keep the installed app and its backup; restore the original signing key.";;
    *INSTALL_FAILED_VERSION_DOWNGRADE*)
      echo "DIAGNOSIS: New APK versionCode is lower than the installed app. Build a version with a higher versionCode using the SAME signing key.";;
    *INSTALL_PARSE_FAILED*|*NO_CERTIFICATES*|*INVALID_APK*)
      echo "DIAGNOSIS: Android rejects the APK's structure, manifest, or signature. Review the APK build and apksigner verify result.";;
    *INSTALL_FAILED_TEST_ONLY*)
      echo "DIAGNOSIS: Test-only APK. The diagnostic already uses adb install -t; check other installation policies.";;
    *INSTALL_FAILED_BLOCKED*|*INSTALL_FAILED_USER_RESTRICTED*)
      echo "DIAGNOSIS: Phone management or user restrictions block installation.";;
    *)
      echo "DIAGNOSIS: Preserve the full adb error shown above; it is needed for the next targeted fix.";;
  esac
  echo "The existing app and local data were NOT intentionally removed."
  exit "$status"
fi
echo "Upgrade installed successfully. Check the existing plans and logs in openForm before doing anything else."
