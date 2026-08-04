# RideGuide brand tokens

Pulled from the marketing site so the poll reads as the same product.
Everything below lives in the `T` object at the top of `components/RideGuidePoll.jsx`.

## Colour

| Token | Hex | Where it goes |
|---|---|---|
| `ink` | `#0E3B37` | Deep teal. Headings, dark panels, selected borders, primary buttons |
| `inkDeep` | `#0A2E2B` | Pressed states |
| `paper` | `#FAF7F2` | Warm cream page background. Not white, not grey |
| `surface` | `#FFFFFF` | Cards sitting on cream |
| `mint` | `#A5E9D1` | The accent. Button labels on teal, active markers, the terminal dot, the full stop in a headline |
| `mintSoft` | `#E4F6EF` | Selected card fill |
| `muted` | `#5C716D` | Teal tinted body grey |
| `hairline` | `#DFD9CF` | Warm rules on cream |
| `hairlineCool` | `#CBDDD8` | Rules and tracks that sit against teal |
| `green` | `#12695C` | Positive states, links |
| `orange` | `#B4562A` | Warnings. Warm clay, not a hot orange, so it stays on brand |

Mint is an accent, never a background for body text. Teal on cream and mint on teal both clear WCAG AA.

## Type

One family, **Figtree**, at four weights. The marketing site uses a single grotesque throughout, so the poll does too.

| Class | Setting | Use |
|---|---|---|
| `.rg-display` | 800, tracking `-0.035em` | Headlines. Tight, big, low contrast in width |
| body | 400 to 600 | Everything else |
| `.rg-label` | 700, tracking `0.14em`, uppercase | The small tracked labels: eyebrows, progress, status |
| `.rg-num` | 700, tabular figures, no tracking | Badges and rank numerals, so centred digits stay centred |

The old build mixed Barlow Semi Condensed, Public Sans and IBM Plex Mono. All three are gone.

## Motifs

- **The diamond** in a circle is the logo mark. `<Logo />` and `<Wordmark />` render it in CSS, no image asset.
- **The route line** is the progress bar: stations for questions, mint marker for where you are. Same polyline shape as the hero graphic.
- **The mint full stop.** Headlines end with a period tinted mint, the way "The calmer way to get there." does on the site.
- **Rounded corners** are generous: 24px on hero panels, 18px on stat cards, 14px on option cards.
- **Dark teal panels on cream**, not edge to edge colour. The hero and the stat cards float.

## Fonts in production

The component loads Figtree with a CSS `@import`, which works anywhere including a static host. On Vercel you can swap to `next/font/google` in `app/layout.jsx` to self host it and drop the render blocking request:

```jsx
import { Figtree } from "next/font/google";
const figtree = Figtree({ subsets: ["latin"], weight: ["400","500","600","700","800"], display: "swap" });
// <html lang="en" className={figtree.className}>
```

Then delete the `@import` line from the component. It needs network access at build time, so it fails in an offline sandbox but is fine on Vercel.
