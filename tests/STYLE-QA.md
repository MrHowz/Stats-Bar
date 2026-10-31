# Stat Bar 1.4.0 QA inventory

- Branding: manifest/action/context/header/settings/browser title all Stat Bar; SVG extension icon visible.
- Per-token styles: row Style button and context Style button open preview chooser; choose pixel -> green flame -> pixel; other tokens unchanged; reload preserves choice.
- Overlay art: generated transparent frame, fixed fill URL with proportional width, numbers readable, matching green heart/metal shield; 0/full HP; large 99999 values; hidden numbers and no badges for restricted viewers.
- Permissions: players without edit rights cannot change style; missing/deleted token disables choices; unknown/legacy style defaults to pixel.
- Fit: main 440x690, context 230x194 and chooser 380x440. No horizontal clipping; both style choices and close control visible.
- Exploratory: switch styles after changing HP; reload chooser and return; light theme; HP zero plus badges; narrow host.

Validation evidence: model/hosted-art/renderer tests and Playwright screenshots under outputs/stat-bar-1.4.0-*.
