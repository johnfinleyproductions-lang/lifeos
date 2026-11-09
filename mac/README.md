# LifeOS for the Mac

A real Mac app: its own icon, its own window, launched from the Desktop or
the Dock. It needs no server. The app carries LifeOS inside it and runs it on
this Mac only; the data is in NoCodeBackend, as everywhere else.

## Build it

On the Mac, in Terminal, from the LifeOS folder:

```bash
git fetch && git checkout v2-ncb && git pull
./mac/build-app.sh
```

The first run asks three things: a household code, the people (name and
email each), and the time zone. Then it builds, puts **LifeOS** in
Applications, puts a shortcut on the Desktop, and opens it. Allow a few
minutes.

It needs Node 22 or newer. For the app's own window it also needs Apple's
command line tools; if they are missing, run `xcode-select --install` once and
build again. Without them you still get an app, but it opens LifeOS in your
browser.

## The first time each person picks their name

Their account is created at that moment, and NoCodeBackend only allows that
while public sign-up is on for the `54318_lifeos` database. It is off.

1. Switch public sign-up on: in the NoCodeBackend dashboard, or ask Claude
   ("turn on public sign-up for 54318_lifeos").
2. Open LifeOS, enter the household code, pick your name. Have everyone else
   do the same.
3. Switch public sign-up off again.

If you forget step 1, the picker tells you so.

## Settings

One file, written by the build script:

```
~/Library/Application Support/LifeOS/lifeos.env
```

Open it from the menu: **LifeOS > Open Settings File**. Quit and reopen
LifeOS after changing it. Building the app again never touches this file.

Two lines matter most.

`LIFEOS_SECRET` was generated for you. Each person's sign-in is derived from
it. Copy it into your password manager now. If it is lost or changed, nobody
can sign in until the original is back; the data itself is unharmed.

`LIFEOS_URL` is commented out. When LifeOS is deployed on your server, put
the address there and this app becomes a window onto that server, with
nothing running on the Mac. When you deploy, give the server the **same
`LIFEOS_SECRET`, household code and profile list** as this file, so the same
people sign in to the same logs from the Mac, the phone and the browser.

## The coach

The coach talks to a model server on your own hardware. By default that is
Ollama on this Mac (`localhost:11434`), so if Ollama is running, the coach
works with no settings at all.

**Which model** is chosen on the Coach page: the Model menu beside the
message box lists every chat model the server has. Pick one and it is
remembered on this Mac. Pull a new model in Ollama, press Refresh, and it is
in the list.

**Which machine** is a setting. To use Ollama on another computer, add its
address to the settings file and reopen LifeOS:

```
LIFEOS_LLM_BASE_URL=http://192.168.4.200:11434/v1
```

Any server that speaks the OpenAI API works the same way: LM Studio,
llama.cpp, vLLM.

## Day to day

- **Cmd R** reloads. **Cmd 1** goes to Today. **Cmd [** and **Cmd ]** go back
  and forward. **Cmd =** and **Cmd -** change the size of everything.
- Closing the window quits LifeOS and stops its server.
- Links that leave LifeOS open in your browser.
- After pulling new code, run `./mac/build-app.sh` again.

## If it does not open

The app shows a short message saying what went wrong. The detail is in the
log, **LifeOS > Show Log**, or:

```
~/Library/Logs/LifeOS/server.log
```

- **"No settings yet."** Run the build script; it writes the file.
- **"LifeOS cannot reach its data."** The Mac is offline, or `NCB_INSTANCE`
  is wrong.
- **"Node.js was not found."** Node moved since the build, for example after
  an upgrade. Build again.
- **"LifeOS stopped while starting."** Read the end of the log. A line
  starting `[profiles]` means the people list is not valid; `[time]` means
  the time zone name is not one the system knows.
- **The window did not compile.** The build says so and falls back to the
  browser version. The compiler's message is in `mac/dist/swift-errors.txt`.

## Remove it

Drag LifeOS from Applications to the Trash, delete the Desktop shortcut, and
delete the two folders above if you want the settings and log gone. Your data
stays in NoCodeBackend.

## How it is put together

- `LifeOS.swift` is the window: about 500 lines of AppKit and WebKit. It reads
  the settings, starts the packed server on `127.0.0.1` (this Mac only, not
  the network), waits for it to answer, and shows it. It stops the server
  when you quit.
- `build-app.sh` builds LifeOS, packs the server into the app, compiles the
  window, makes the app, signs it for this Mac and installs it.
- `LifeOS.icns` is the icon, drawn from `icon-1024.png`.

The app is signed for the Mac that built it and is not meant to be copied to
another Mac. Build it there instead.

## What was and was not tested

The launch sequence was run on Linux the way the app runs it: the packed
server on `127.0.0.1`, settings from a file, and the full picker sign-in
driven in the WebKit engine, which is the engine the Mac window uses.

`LifeOS.swift` and `build-app.sh` were written on a machine that cannot
compile or run Mac software, so neither has been run on a Mac yet. Your first
build is their first real test.
