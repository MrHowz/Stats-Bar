# Stat Bar 1.4.1 QA inventory

- Removed green-flame choice and artwork build dependencies. Classic is the only current choice; per-token style infrastructure stays.
- Old green-flame metadata and existing overlays fall back to classic, preserving HP/MAX/TEMP/AC, name and visibility.
- Main/context numeric fields use Roboto and tabular numerals, with no Pixel font resource requests; smooth UI heart/shield/settings icons.
- Main 440x690, context 230x194, style selector 380x280; light/dark themes and editable versus restricted player controls.
- Exercise HP expression + reload, selector open/close and migration with legacy metadata. Map artwork retains its classic font.
- Off-path: five-digit numeric input, removed or missing style metadata, missing token selector.
