# Design — CulinaryAdmin

World: a hotel front-desk key rack in black lacquer. Each license is a key plate hung on its hook. User pin: dark, with black and red as the main colours.

## Tokens (src/theme.css)

| Role | Token | Value |
|---|---|---|
| Rail | `--rail` | #070708 |
| Ground | `--bg` | #0c0c0e |
| Panels | `--panel` / `--panel-2` / `--raise` | #141417 / #1c1c20 / #24242a |
| Rules | `--line` / `--line-strong` | #2b2b31 / #3a3a42 |
| Text | `--ink` / `--text` / `--muted` | #eeebe4 / #cfcbc2 / #9a958c |
| Red lacquer | `--red` / `--red-hover` / `--red-ink` | #d7263d / #e83a51 / #ff6b7d |
| Brass (expiries, counters) | `--brass` | #cfa96d |
| Active status | `--green` | #63c08f |
| Expired status | `--amber` | #e8ad4f |

Type: Manrope Variable for the interface; JetBrains Mono only for data (dates, siteIds, IDs, versions), with tabular figures.

## Rules

- **Where red goes.** Red marks primary actions, destructive actions, the selected key's hook, the nav marker and focus rings. It never marks a status that is just fine.
- **Key states.** Each state has a single physical trait:
  - active: a steel cord and ivory pin;
  - selected: a red cord, red pin, red outline and the plate lifted;
  - pending: a dashed outline with no plate;
  - expired: an amber top edge;
  - revoked: the name struck through and the plate dimmed.
- **"Vencen pronto" strip.** It sits above the rack, sorted by date, with brass dates (red once the date has passed) in fixed columns.
- **Controls.** Every control is a standard one: segmented filters, tables, a side drawer for detail, and a native `<dialog>` for creating, confirming and one-time secrets. Irreversible actions name the license and ask you to type its siteId.
- **Motion.** A plate swings 2° about its pin on hover; dialogs pop and the drawer slides in, with an exponential ease-out. All of it is disabled under reduced motion.
- **Phones (≤900px).** The rail becomes a scrolling tab bar with an edge fade, and the columns stack.
