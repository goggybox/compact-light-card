# Changelog

Notable changes in each release are documented here.

---

## v0.5.2 - [2025-08-14]

- docs: update `README.md` to improve image references, making them appear in HACS
- docs: update `README.md` to provide a simpler installation guide; reflecting the card's addition to the HACS default list
- docs: create a comprehensive `CHANGELOG.md` file

## v0.5.1 - [2025-08-14]

- fix: minor colour bug where the colour of the card would briefly change as the light turns off

## v0.5.0 - [2025-08-14]

- feat: allow displayed name to be customised
- feat: allow chevron tap action to be customised
- change: prevent brightness bar from being dragged below 1%
- fix: visual bug when brightness bar is clicked while light is off
- fix: buggy behaviour after brightness bar is dragged below 1%

## v0.4.0 - [2025-08-13]

- feat: allow card's primary and secondary colours to be customised

## v0.3.1 - [2025-08-13]

- add: HACS validation Action for hacs/default pull request

## v0.3.0 - [2025-08-13]

- feat: allow the card's colour when the light is off to be customised
- feat: allow the card border colour and icon border colour to be customised
- fix: bug where stale light status would be displayed upon UI reload
- fix: bug of brightness bar falling slightly behind/ahead of the mouse when dragging

## v0.2.0 - [2025-08-10]

- feat: smoother brightness drag
- add: drop-shadows to icon and brightness bar to improve contrast against lighter colours
- fix: improve performance on mobile version by throttling updates to once per frame
- fix: bug where brightness would jump around after excessive dragging due to queued updates
- fix: minor visual misalignment in brightness bar

## v0.1.0 - [2025-08-09]

- initial release
