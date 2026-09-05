# Note Explorer 🎵

A simple, friendly music note guessing game for young kids learning to read notes on the treble clef staff.

## How to play

Just open `index.html` in a web browser — no install or build step needed. (Some browsers block audio until the page is interacted with, which is handled automatically by the game's buttons.)

Two modes, picked from the home screen:

- **Name That Note!** — a note appears on the staff; tap the matching letter (A–G).
- **Place the Note!** — a letter is shown; tap the staff where that note belongs.

A difficulty toggle controls the note range:

- **5 notes (C–G)** — middle C up through G, a gentle starting range.
- **8 notes (C–C)** — a full octave from middle C to the C above.

There's no timer, no wrong-answer penalty, and unlimited retries — just gentle sounds, a star counter, and confetti for correct answers. Total stars earned are saved in the browser (`localStorage`) so progress carries over between sessions.
