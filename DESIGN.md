# Design — CulinaryAdmin

World: a restaurant's back office at night. A dark lacquered desk lit by red neon, with a glossy enamel badge for each kind of work. The user's concept (2026-11-03): dark, black and red, rounded cards, colored glossy icons. The mockups are in `docs/rediseno/`.

## Tokens (src/theme.css)

| Role | Token | Value |
|---|---|---|
| Ground | `--bg` | #0b0a0d |
| Rail | `--rail` | #0d0b0f, with a red arc along its right edge |
| Cards | `--panel` / `--panel-2` / `--raise` | #141218 / #1a171f / #221e28 |
| Rules | `--line` / `--line-strong` | #2a2530 / #383140 |
| Text | `--ink` / `--text` / `--muted` / `--faint` | #f3f0ea / #d4cfc7 / #948e98 / #6b6570 |
| Red neon | `--red` / `--red-ink` / `--red-deep` | #e1263f / #ff7184 / #8f1325 |
| Status | `--green` / `--amber` | #4fd18b / #f2a93b |

Each section has a tone (`.tone-red`, `violet`, `teal`, `amber`, `gold`, `blue`, `steel`) that sets its badge gradient, its card tint and its sparkline. Licenses are red, revenue gold, versions violet, support teal, faults red and amber, branches violet, the owner panel gold, the team violet and steel.

Type: Manrope Variable for the interface; JetBrains Mono only for data (dates, siteIds, IDs, versions, amounts in tables), with tabular figures.

## Rules

- **Where red goes.** Red marks the selected section, primary and destructive actions, the selected row and focus rings. A status that is just fine is green, never red.
- **Masthead.** Every page opens with a red bar, its title and one line of purpose. Search, the alert bell and the settings gear sit at the top right, and the page's own actions go under them.
- **Headline numbers.** Four tiles per page, each a glossy badge, a big number, a label and, when there is a real series, a sparkline. A tile that leads somewhere is a button with an arrow; chips say how it moved. Never invent a series: a tile without data has no sparkline.
- **List and detail.** A table on the left and the selected item's detail on the right. Under 1280px the detail becomes a drawer over the list, with a close button.
- **License states.** Active is green, about to expire (7 days) and expired are amber, pending is grey, revoked is red. The detail shows the expiry on a plate with a red pin, the days left and a bar for the period that remains.
- **Money.** Amounts are centavos of MXN without IVA, shown as pesos with cents only when there are any. Prices are typed in pesos.
- **Controls.** Every control is a standard one: segmented filters, tables, the detail column, and a native `<dialog>` for creating, confirming and one-time secrets. Irreversible actions name the license and ask you to type its siteId.
- **Motion.** Dialogs pop and the drawer slides in, with an exponential ease-out; tiles lift 1px on hover. All of it is disabled under reduced motion.
- **Phones (≤900px).** The rail becomes a scrolling tab bar with an edge fade, the masthead stacks, and every grid becomes one column.
