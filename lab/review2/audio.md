# audio: louder, no clipping

Bus at `intro.js:78-86`, cues at `204-255` and `1350-1370`, voice at `130-149`.
Voice files peak -9.8 to -12.7 dBFS but average -30 to -33; the old 1.35 gain
reads quiet by mean while cue peaks drive the bus. Lift the average.

## bus

master 0.75 (was 0.9), then compressor threshold -15 dBFS, knee 8, ratio 2.5,
attack 15 ms, release 200 ms, makeup 1.33 (+2.5 dB), then limiter threshold
-2, knee 0, ratio 20, attack 2 ms, release 80 ms. Ceiling about -2 dBFS.
Worst stack (clank 1.35 plus thump) lands at -8.5; limiter idles.

## cue gains (linear, source node)

| cue | now | target |
|---|---|---|
| servo | 0.06 | 0.13 |
| ratchet tick | 0.02 | 0.08 |
| clank partials | .12/.06/.04 | .16/.08/.053 |
| clank body | .09k | .12k |
| power-up rise | 0.07 | 0.12 |
| power-up pips | .035/.03 | .08/.07 |
| ambience noise/sub | .09/.045 | .14/.06 |
| button pick/press/hover | .05/.035/.02 | .08/.06/.04 |
| tick/choose | .02/.05 | .032/.08 |
| TTS | 1.35 | 3.2 |

Output peaks: clank -8.5, TTS -10, servo and power-up -18, buttons -22 to
-28, tick -30, bed -23 rms. Bed lowpass 160 to 240 Hz so it survives laptop
speakers. TTS chain: gain 3.2, compressor threshold -22, knee 6, ratio 2.5,
attack 5 ms, release 140 ms, makeup 2.0 (+6 dB). Mean rises 14 dB, peak drops
2 dB. Ratchet and servo take the biggest lift; clank gains 4 dB and still sits
6 dB under the ceiling.
