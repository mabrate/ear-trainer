# Keyroom — ear-training utilities

A dependency-free site with locally bundled VCSL Yamaha upright recordings. No accounts, build step, or runtime CDN.

## Run

From this folder:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://localhost:8000. Routes:

- `/`: utility directory.
- `/piano/`: standalone full-size piano (visiting `/piano` redirects here).
- `/triads/`: triad identification practice.
- `/melodic-dictation/`: quarter-note melodic dictation.
- `/sight-reading/`: endless treble-clef sight-reading practice.

Serve over HTTP; opening HTML files directly cannot load modules/samples. Once served, no internet connection is needed. There is no service worker; keep the local server running.

## Piano

A tiny, hideable reference piano sits at the bottom of every page. Its visibility is remembered in this browser. On `/piano/`, physical-key input plays the full piano when the reference piano is hidden, and the reference piano when it is open.

- White keys: A S D F G H J K L ; " (C through F in the next octave).
- Black keys: W E T Y U O P. Upper-row gaps follow the piano gaps between E–F and B–C.
- Physical US keyboard positions are used; the quote key needs no Shift.
- Space: hold sustain when focus is on the page. Focused buttons retain normal Space activation. Sustain button: latch.
- Left/right arrows: octave. Escape: stop all. Enter plays a focused piano key.
- Mouse and multitouch work too. Computer keyboard hardware may limit chords.
- Hiding the reference piano, leaving the window, or changing tabs releases its sound.

## Triads

All four qualities are practiced: major, minor, augmented, diminished. The selected range bounds **every sounding note**, including inversions. Minimum span: nine semitones. Each new question varies the bass pitch class from the previous question and randomly chooses quality and, when enabled, inversion.

- **Include inversions:** mix root position, first inversion, and second inversion; identify the inversion as well as the quality.
- **Arpeggiated playback:** play notes low to high, 300 ms apart, with overlapping tails. Otherwise notes sound together.
- **Mix block & arpeggiated:** randomize playback and also ask which presentation you heard. This takes precedence over the arpeggio toggle.
- Augmented triads are symmetric: their inversions cannot be uniquely identified by sound. Choose **Ambiguous** for their inversion. No root naming is required.
- Replay without penalty. Check answer once per question. Reveal counts as a missed answer; Skip leaves the score unchanged. Feedback shows quality, inversion, presentation, and sounding notes.
- Changing settings cancels the current question; start a new one with the new settings. Score is session-only; Reset score clears it.
- Reference-piano sustain and volume are independent of exercise playback. The reference piano never highlights the quiz notes automatically.

## Melodic dictation

Choose an inclusive range (C2–C6), 2–16 notes, and 40–200 BPM. Choose any chromatic pitch or constrain the melody to a major, natural minor, or major pentatonic scale with a selected tonic. **Any tonic (random)** and **Any pitch set (random)** can be selected independently. Each new melody chooses a concrete combination that fits the range; replays keep that combination. Any pitch set includes chromatic, major, natural minor, and major pentatonic. The chosen set is shown above the staff. At least two allowed pitches must fit in the range. Starting pitches vary between questions. **Easy** chooses neighboring pitches in the selected pitch set about 80% of the time, with occasional leaps up to a fifth. **Medium** favors leaps (about 60%) up to an octave. **Hard** freely chooses any allowed pitch, including repetitions and wider leaps. Narrow ranges may limit the available leaps; adjacent notes in sparse scales such as pentatonic may be more than a whole step apart. Changing difficulty starts a fresh question.

Start to hear evenly spaced quarter notes. The grand staff supplies the first note; it cannot be changed. Click a remaining note's column on a staff line or space to enter its pitch. After clicking a note, it takes keyboard focus: use Up/Down immediately to adjust its line or space, or Left/Right to select another note. Both staves display the selected major or natural minor key signature; major pentatonic uses its major signature. Chromatic melodies have no signature. **Follow staff** is the default accidental setting, so clicking F in G major enters F-sharp automatically. The accidental menu’s Natural, Sharp, and Flat options override the signature. Fixed keys preview their signatures before starting; random keys show the resolved signature with each melody. Every entered pitch must be inside the selected range and scale. Accidentals appear only when needed, carry within a measure for that written pitch, and reset at the next bar. Note spelling follows the key, including E-sharp or C-flat where needed. Notes are grouped in fours, with a shorter final group when necessary.

The numbered slot buttons select positions. With a slot focused, Up/Down enters or adjusts the staff position, Left/Right moves between slots, and Delete/Backspace clears it. Erase selected note and Clear answer preserve the supplied first note. For long melodies or narrow screens, scroll the staff horizontally.

Replay the target freely, or Play my answer (empty slots remain silent quarter-note beats). Check becomes available when every slot is filled. Feedback counts the entered notes, excluding the supplied first note; the melody score requires every note to match. Incorrect notes appear orange. Toggle the solution staff to compare. Enharmonic equivalents are accepted by sounding pitch. Reveal counts as missed; skipping leaves the score unchanged. Settings changes discard the current question. The reference piano remains available below.

## Sight reading

A page contains four treble-clef lines of four 4/4 measures each. Choose a major, minor, or chromatic key, a lowest/highest sounding note (C3–C6), 30–200 BPM, eighth- or sixteenth-note subdivisions, optional accidentals, leap size, and rest complexity. **Dotted rhythms** (on by default) adds dotted-quarter/eighth patterns and, with sixteenth subdivisions, dotted-eighth/sixteenth patterns. Turn it off for undotted notes. Dotted quarters stay within beats 1–2 or 3–4; shorter patterns stay within a beat. Adjacent eighth and sixteenth notes share beams within each quarter-note beat; four consecutive eighths join across beats 1–2 or 3–4. Beams break between beats 2–3 and at rests. Sixteenths have a second beam, including partial hooks in mixed groups; isolated notes retain flags. Small leaps span up to a third, medium up to a fifth, and large allow the entire selected range. Range limits apply to every sounding pitch, including optional accidentals. The default is C4–A5. Chromatic includes all semitones with no key signature and written accidentals; the optional-accidentals checkbox applies to tonal keys. With accidentals enabled, about 18% of notes receive an alteration outside their signature. Rests can be absent, occasional beat rests, or mixed subdivision rests. Adjacent silence consolidates into readable larger rests: two eighth rests within a beat become a quarter rest, two quarter rests across beats 1–2 or 3–4 become a half rest, and an entirely silent bar becomes a whole rest. Partial-beat rests preserve beat boundaries. Dotted rests are available with dotted rhythms enabled. Notation shows the key signature and measure-local accidental changes.

Start metronome gives a four-quarter-note count-in. Clicks mark each quarter note and accent the downbeat; a translucent gray bar tracks the current position. The exercise does not play the written melody, so you can read it on your instrument. At the start of each measure, the measure eight ahead is replaced. Read line one through line four, then return to line one. Numbers show the advancing measure sequence. Only the future measure redraws; current notation stays still.

Stop, Escape, leaving the window, or hiding the tab silences the metronome. Starting again begins at the top with a fresh page and count-in. Changing settings or New music stops and regenerates the page. Click volume can change while running. Narrow screens scroll the score horizontally to keep sixteenth notes readable. The shared reference piano remains available below.

## Structure

`site.js` mounts the shared bottom piano; `app.js` exports the reusable piano UI. Each route uses ordinary static HTML. `triads/theory.js` holds pure generation/voicing/grading functions; `triads/trainer.js` manages the exercise. `melodic-dictation/music.js` holds melody, scale, staff-coordinate, and grading logic; its trainer renders an SVG grand staff without external libraries.

`piano-engine.js` exports `PianoEngine`, independent of the UI. Call `await engine.load()` from a user gesture, then `noteOn(midi, velocity, voiceId)` / `noteOff(voiceId)`, `playNote(midi, {duration: 800})`, `playChord(notes, {arpeggiated: true})`, or `playMelody(notes, {tempo: 90})`. MIDI 60 is middle C. `playChord` schedules on the audio clock and returns a cancellation function. Use separate voice IDs for overlapping notes. `stopAll()` silences all voices. Samples load relative to the module, so nested routes work.

This first instrument uses 13 medium-velocity sustain recordings (C/G roots), with playback gain for soft/medium/strong touch. Nearest-root recordings are pitch shifted. Release samples, round robins, pedal resonance, and recorded velocity switching are not implemented.

## Validation

```sh
npm test
```

Tests cover triad voicings, range bounds, pitch variation, grading, augmented ambiguity, route-independent sample loading, simultaneous/arpeggio scheduling, sustain release, cancellation, melody scale/range bounds, staff pitch mapping, melody grading, and quarter-note timing. Syntax checks pass for the JS modules. Browser/audio hardware verification still requires a manual check:

1. Open `/piano` directly; enable samples and play A–quote, the black keys, and a chord. Try sustain, octave shift, and Escape.
2. Open `/triads` directly; start, replay, answer, reveal, and advance. Confirm score changes once per question.
3. Enable inversions and mixed playback; confirm all answer groups appear. Change the range and confirm a fresh question is required. Try an invalid range.
4. Show/hide the bottom piano; confirm held notes stop when hidden. Navigate between pages and confirm visibility is remembered.
5. Open `/melodic-dictation` directly; hear a melody, fill the staff, revise/erase notes, play your answer, check, and compare with the solution. Confirm the supplied first note stays fixed.
6. Test chromatic, sharp, and flat scales, both clefs, range limits, different lengths/tempos, keyboard slot entry, and revealing an incomplete answer.
7. Open `/sight-reading`; check the count-in, downbeat accent, gray marker, four-line wrap, and that only the measure eight ahead changes. Test key signatures, both rhythm grids, rests, accidentals, leap sizes, Stop, Escape, and leaving the page.
8. On a narrow screen, confirm the piano and grand staff scroll horizontally and answers remain accessible.

## Sample provenance

Samples: [Versilian Community Sample Library](https://github.com/sgossner/VCSL), `Chordophones/Zithers/Upright Piano, Yamaha/Sustains`, medium velocity, round robin 1. The VCSL filename octave convention is one octave below scientific pitch notation: source C3 maps to MIDI 60 / displayed C4. Source license: `samples/LICENSE` (CC0). [VCSL Keys](https://versilian-studios.com/vcsl-keys/) packages the keyboard instruments from this collection.
