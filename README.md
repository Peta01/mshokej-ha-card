# MS Hokej Card

Lovelace custom card for the Home Assistant integration snapshot sensor.

## Install locally

1. Copy `mshokej-card.js` to `config\www\`.
2. Add a Lovelace resource:
   - URL: `/local/mshokej-card.js`
   - Type: `module`
3. Add the card:

```yaml
type: custom:mshokej-card
entity: sensor.ms_hokej_snapshot
title: Mistrovství světa v ledním hokeji 2026
```

## Recommended dashboard view

For full-width rendering in Home Assistant, use this card in a dedicated `panel` view.
Using it inside a `sections` view may keep the card visually constrained to the section grid.

Example:

```yaml
type: panel
title: MSHOKEJ
path: mshokej
icon: mdi:hockey-sticks
cards:
  - type: custom:mshokej-card
    entity: sensor.snapshot
    title: Mistrovství světa v ledním hokeji 2026
```

## What it renders

- overview cards
- both group tables
- playoff bracket
- nearest, played and remaining matches
- predictions
- local light/dark toggle

The visual style is intentionally based on the existing `report.html`.
