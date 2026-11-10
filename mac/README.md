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

## Reminders, export and search

**Reminders** are in Settings. Pick a time for the morning page and the
evening page and press Add to my calendar. Calendar opens with two daily
events, each with an alert. Because they live in your calendar they reach
your phone and watch too, and on this Mac the alert's link opens LifeOS on
the right page. To change the times, add it again; to stop, delete the events.

**Export** is in Settings, under Your data. Download to read gives one
document with your journal, days, habits, focus, quests and compass. Download
the full record gives every row as stored. Both land in your Downloads folder
and are shown in Finder.

**Search** is on Journal, Past entries. Every word you type has to appear in
the entry.

## Experiments

An optional section for trying something small for a set time and then
deciding about it. It is off to begin with. Turn it on under Settings,
Experiments, and it appears in the rail under The day.

Write the sentence (I will do this, for this long), then each day tap Done
today or Not today and add a line on how it went. The mark is also on Today
and above the evening page. When the time is up it asks what worked, what
did not and what next, and you choose to keep going, make it a habit, pause
it, or change it and run again. Marking a day needs the internet for now.

## Writing with no internet

The app opens and works for writing when the Mac is offline. Any page takes
you to the Offline desk, where you can write a journal entry, a short morning
or evening page, and tick today's habits. A page you already had open (the
morning cards, the journal) saves the same way. Each one is kept on the Mac
and a mark in the corner counts what is waiting. When the internet is back
they send themselves within about twenty seconds, in the order you wrote
them, dated to when you wrote them.

If you wrote the same day's morning or evening page on your phone in the
meantime, whichever was written later is the one that stays.

Reading past entries, quests, the coach and everything else still need the
internet. You also need to have picked your name on this Mac once, while
online, before the desk will take writing.

## Dictation

In any box you can type in, use the Mac's own dictation: Edit, Start
Dictation, or press the microphone key (or whatever shortcut is set under
System Settings, Keyboard, Dictation). It works with no setup in LifeOS.

The microphone button next to the journal, the coach and the morning and
evening cards in Chrome or Safari uses the browser's speech recognition. It only
appears where the browser offers that, and the Mac app's window does not yet
ask for the microphone, so do not expect it there.

## Day to day

- **Cmd R** reloads. **Cmd 1** goes to Today. **Cmd [** and **Cmd ]** go back
  and forward. **Cmd =** and **Cmd -** change the size of everything.
- Closing the window quits LifeOS and stops its server.
- Links that leave LifeOS open in your browser.
- After pulling new code, run `./mac/build-app.sh` again.

## If a page says it could not load after an update

Before 9 November 2026 the build script could leave the previous version's
server running, and the new window would pick it up. The sign is a page
that says it could not load while others work. Stop the old server and open
the app again:

```
lsof -ti tcp:3187 | xargs kill
open /Applications/LifeOS.app
```

The script now stops it itself, so this should not come back.

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

Writing with no internet was tested the same way, in the same engine: the
server running with the database unreachable, four writes kept, then the
database back and all four sent on their own with the right dates.

`LifeOS.swift` and `build-app.sh` were written on a machine that cannot
compile or run Mac software, so neither has been run on a Mac yet. Your first
build is their first real test.
