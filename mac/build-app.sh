#!/bin/bash
# Build LifeOS.app on this Mac and put it in Applications, with a shortcut on
# the Desktop.
#
#   ./mac/build-app.sh
#
# Run it from anywhere inside the LifeOS folder. Run it again whenever the
# code changes; your settings and your data are not touched.
#
# What it needs: macOS on Apple silicon or Intel, Node 22 or newer, and
# Apple's command line tools for the window (xcode-select --install). Without
# those tools it still builds an app, one that opens LifeOS in your browser
# instead of its own window.

set -euo pipefail

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

[ "$(uname -s)" = "Darwin" ] || fail "This builds a Mac app, so it has to run on a Mac."

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

command -v node >/dev/null || fail "Node.js is not installed. Get it from https://nodejs.org (version 22 or newer), then run this again."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 22 ] || fail "Node $NODE_MAJOR is too old. LifeOS needs Node 22 or newer."
NODE_BIN="$(node -p 'process.execPath')"

if command -v pnpm >/dev/null; then
  PNPM=(pnpm)
elif command -v corepack >/dev/null; then
  PNPM=(corepack pnpm)
else
  PNPM=(npx --yes pnpm@9)
fi

# ── Settings ────────────────────────────────────────────────────────────
SETTINGS_DIR="$HOME/Library/Application Support/LifeOS"
SETTINGS="$SETTINGS_DIR/lifeos.env"

if [ ! -f "$SETTINGS" ]; then
  say "First run: a few questions, then LifeOS keeps the answers in one file."
  echo "File: $SETTINGS"
  echo

  CODE=""
  while [ "${#CODE}" -lt 4 ]; do
    read -r -p "Household code (4 or more characters; everyone in the house types this once): " CODE
  done

  echo
  echo "Now the people. Each needs a name and an email. The email only names"
  echo "their account; no mail is ever sent to it. Leave the name empty when done."
  PROFILES=""
  ACCENTS=(violet rose sky green gold)
  COUNT=0
  while true; do
    read -r -p "Name: " PNAME
    [ -z "$PNAME" ] && { [ "$COUNT" -gt 0 ] && break || continue; }
    read -r -p "Email for $PNAME: " PEMAIL
    case "$PEMAIL" in *@*.*) ;; *) echo "That does not look like an email. Try again."; continue ;; esac
    ENTRY="$(NAME="$PNAME" EMAIL="$PEMAIL" ACCENT="${ACCENTS[$((COUNT % 5))]}" node -e '
      const name = process.env.NAME.trim();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "person";
      process.stdout.write(JSON.stringify({ slug, name, email: process.env.EMAIL.trim().toLowerCase(), accent: process.env.ACCENT }));
    ')"
    PROFILES="${PROFILES:+$PROFILES,}$ENTRY"
    COUNT=$((COUNT + 1))
  done

  read -r -p "Time zone [America/Chicago]: " ZONE
  ZONE="${ZONE:-America/Chicago}"

  mkdir -p "$SETTINGS_DIR"
  umask 077
  cat > "$SETTINGS" <<SETTINGS_EOF
# LifeOS settings for this Mac. Read each time the app opens.
# Menu: LifeOS > Open Settings File. Quit and reopen LifeOS after a change.

# The NoCodeBackend database that holds everything.
NCB_INSTANCE=54318_lifeos

# Signs the profile cookie and derives each person's sign-in.
# DO NOT CHANGE THIS, and keep a copy somewhere safe. If LifeOS is also
# deployed on a server, the server must use this exact value, or the same
# people will not be able to sign in there.
LIFEOS_SECRET=$(openssl rand -base64 36)

LIFEOS_HOUSEHOLD_CODE=$CODE
LIFEOS_PROFILES='[$PROFILES]'
LIFEOS_TIMEZONE=$ZONE
LIFEOS_DAY_START=4

# Once LifeOS is deployed, put its address here and this app becomes a
# window onto that server instead of running its own copy:
# LIFEOS_URL=https://lifeos.example.com

# The coach talks to Ollama on this Mac unless told otherwise. Which model
# it uses is picked on the Coach page, from whatever that server has.
# To use a model server on another machine, set its address here:
# LIFEOS_LLM_BASE_URL=http://192.168.4.200:11434/v1
# LIFEOS_LLM_API_KEY=ollama
# The model to start on, before anyone has picked:
# LIFEOS_LLM_MODEL=qwen2.5:32b
SETTINGS_EOF
  chmod 600 "$SETTINGS"
  say "Settings written."
else
  say "Using your existing settings: $SETTINGS"
fi

# ── Build LifeOS itself ─────────────────────────────────────────────────
say "Installing packages"
"${PNPM[@]}" install --frozen-lockfile || "${PNPM[@]}" install

say "Building LifeOS"
NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_APP_URL="http://127.0.0.1:3187" "${PNPM[@]}" build
[ -f .next/standalone/server.js ] || fail "The build finished without a server to pack. Nothing was installed."

# ── Assemble the app ────────────────────────────────────────────────────
say "Putting the app together"
APP="$ROOT/mac/dist/LifeOS.app"
rm -rf "$ROOT/mac/dist"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/app"

cp -R .next/standalone/. "$APP/Contents/Resources/app/"
mkdir -p "$APP/Contents/Resources/app/.next"
cp -R .next/static "$APP/Contents/Resources/app/.next/static"
[ -d public ] && cp -R public "$APP/Contents/Resources/app/public"
# Settings live in Application Support, never inside the app.
find "$APP/Contents/Resources/app" -maxdepth 1 -name '.env*' -delete

printf '%s\n' "$NODE_BIN" > "$APP/Contents/Resources/node-path"
cp "$ROOT/mac/LifeOS.icns" "$APP/Contents/Resources/LifeOS.icns"

VERSION="$(node -p 'require("./package.json").version || "0.1.0"')"
cat > "$APP/Contents/Info.plist" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>LifeOS</string>
  <key>CFBundleDisplayName</key><string>LifeOS</string>
  <key>CFBundleIdentifier</key><string>app.lifeos.desktop</string>
  <key>CFBundleExecutable</key><string>LifeOS</string>
  <key>CFBundleIconFile</key><string>LifeOS</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleVersion</key><string>$(date +%Y%m%d%H%M)</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.productivity</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLName</key><string>app.lifeos.desktop</string>
      <key>CFBundleURLSchemes</key><array><string>lifeos</string></array>
    </dict>
  </array>
  <key>NSAppTransportSecurity</key>
  <dict><key>NSAllowsLocalNetworking</key><true/></dict>
</dict>
</plist>
PLIST_EOF

# ── The window ──────────────────────────────────────────────────────────
WINDOW="native"
if command -v swiftc >/dev/null && xcode-select -p >/dev/null 2>&1; then
  say "Compiling the window"
  TMP="$(mktemp -d)"
  cp "$ROOT/mac/LifeOS.swift" "$TMP/main.swift"
  if ! swiftc -O -swift-version 5 "$TMP/main.swift" -o "$APP/Contents/MacOS/LifeOS" \
        -framework Cocoa -framework WebKit 2> "$ROOT/mac/dist/swift-errors.txt"; then
    WINDOW="browser"
    echo "The window did not compile. The reason is in mac/dist/swift-errors.txt."
    # A window that compiled on an earlier build still works with the new
    # LifeOS inside it. Keep it rather than dropping back to the browser.
    for OLD in "/Applications/LifeOS.app/Contents/MacOS/LifeOS" "$HOME/Applications/LifeOS.app/Contents/MacOS/LifeOS"; do
      if [ -f "$OLD" ] && file "$OLD" | grep -q "Mach-O"; then
        cp "$OLD" "$APP/Contents/MacOS/LifeOS"
        WINDOW="kept"
        echo "Keeping the window from your last build. New window features (saving files, reminder links) wait until this is fixed."
        break
      fi
    done
  else
    rm -f "$ROOT/mac/dist/swift-errors.txt"
  fi
  rm -rf "$TMP"
else
  WINDOW="browser"
  echo "Apple's command line tools are not installed (xcode-select --install)."
fi

if [ "$WINDOW" = "browser" ]; then
  say "Building the browser version instead"
  cat > "$APP/Contents/MacOS/LifeOS" <<'LAUNCH_EOF'
#!/bin/bash
# Fallback launcher: start the packed server if it is not up, then open
# LifeOS in the default browser.
HERE="$(cd "$(dirname "$0")/../Resources" && pwd)"
SETTINGS="$HOME/Library/Application Support/LifeOS/lifeos.env"
LOG="$HOME/Library/Logs/LifeOS/server.log"
mkdir -p "$(dirname "$LOG")"
REMOTE="$(grep -E '^LIFEOS_URL=' "$SETTINGS" 2>/dev/null | head -1 | cut -d= -f2-)"
if [ -n "$REMOTE" ]; then open "$REMOTE"; exit 0; fi
PORT="$(grep -E '^LIFEOS_PORT=' "$SETTINGS" 2>/dev/null | head -1 | cut -d= -f2-)"; PORT="${PORT:-3187}"
URL="http://127.0.0.1:$PORT"
if ! curl -s -o /dev/null -m 2 "$URL/api/health"; then
  NODE="$(cat "$HERE/node-path" 2>/dev/null)"
  [ -x "$NODE" ] || NODE="$(command -v node || echo /opt/homebrew/bin/node)"
  set -a; . "$SETTINGS"; set +a
  cd "$HERE/app" && PORT="$PORT" HOSTNAME=127.0.0.1 NODE_ENV=production LIFEOS_APP_URL="$URL" \
    LIFEOS_INSECURE_COOKIES=1 LIFEOS_DESKTOP=1 nohup "$NODE" server.js > "$LOG" 2>&1 &
  for _ in $(seq 1 60); do curl -s -o /dev/null -m 1 "$URL/api/health" && break; sleep 0.4; done
fi
open "$URL"
LAUNCH_EOF
  chmod +x "$APP/Contents/MacOS/LifeOS"
fi

# Sign it for this Mac only, so macOS treats the app as one consistent thing
# between launches. It is not a developer signature and is not meant to be
# shared with other Macs.
codesign --force --deep --sign - "$APP" >/dev/null 2>&1 || true

# ── Install ─────────────────────────────────────────────────────────────
say "Installing"
DEST="/Applications"
[ -w "$DEST" ] || { DEST="$HOME/Applications"; mkdir -p "$DEST"; }
# Stop the copy that is running, and the server it started.
#
# The server has to be found by the port it holds. Its command line used to
# be just "node server.js", which no pattern here matched, so an update left
# the old server running. The new window then found something answering on
# the port, used it, and showed the old build with half its files replaced
# underneath it: pages that had not been opened yet failed to load.
if pgrep -x LifeOS >/dev/null 2>&1; then
  osascript -e 'tell application id "app.lifeos.desktop" to quit' >/dev/null 2>&1 || true
  for _ in 1 2 3 4 5 6; do pgrep -x LifeOS >/dev/null 2>&1 || break; sleep 0.5; done
fi
pkill -x LifeOS >/dev/null 2>&1 || true
pkill -f "LifeOS.app/Contents/Resources/app/server.js" >/dev/null 2>&1 || true
for pid in $(lsof -nP -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null); do
  # Only a node process: anything else on this port is not ours to stop.
  case "$(ps -o command= -p "$pid" 2>/dev/null)" in
    *node*) kill "$pid" >/dev/null 2>&1 || true ;;
  esac
done
for _ in 1 2 3 4 5 6 7 8 9 10; do
  lsof -nP -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 || break
  sleep 0.5
done
rm -rf "$DEST/LifeOS.app"
cp -R "$APP" "$DEST/LifeOS.app"
ln -sfn "$DEST/LifeOS.app" "$HOME/Desktop/LifeOS"

say "Done. LifeOS is in $DEST, with a shortcut on your Desktop."
if [ "$WINDOW" = "browser" ]; then
  echo "This build opens LifeOS in your browser rather than its own window."
elif [ "$WINDOW" = "kept" ]; then
  echo "LifeOS itself is up to date. The window is the one from your last build;"
  echo "send mac/dist/swift-errors.txt to get the new one fixed."
fi
echo "The first time someone picks their name, public sign-up has to be on in"
echo "NoCodeBackend for the 54318_lifeos database. See mac/README.md."
open "$DEST/LifeOS.app"
