# Stat Bar 1.4.3 artwork QA

- Compare current versus revised metal HP frame, red fill, green heart and blue shield at widths 200, 320 and 440.
- Same dimensions, attachment layout and fill scale. No extra API writes or new scene metadata.
- Numeric legibility: 1, 2, 3 and 5 digits; 0/full HP; only Temp or only AC; both badges; badges without HP; no values in hidden mode.
- Check hosted PNGs versus SVG preview and all alpha borders for clipping. Preview selector and main UI still fit their host sizes.
- Functional: edit HP down/up through real controls, and inspect current fill scale; reload preserves stats. Explore hidden number/zero badge cases.
- Evidence saved under outputs/stat-bar-1.4.3-*.
