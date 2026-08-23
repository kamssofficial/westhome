# WESTHOME — Design System

## 1. Visual Theme & Atmosphere

WestHome is a premium home-interior and lifestyle brand by BM Distributors. The design language is:
- **Warm, editorial, minimal luxury** — inspired by Apple's design philosophy and high-end interior publications
- **Quiet confidence** — restrained visual weight, generous whitespace, purposeful typography
- **Calm, expensive-looking** — soft contrast, muted palette, subtle depth
- **Mobile-first** — every component designed for touch, then scaled to desktop

**Design density:** Low (airy, breathable)
**Art direction:** Editorial luxury (not generic SaaS)
**Motion:** Restrained, compositor-friendly (transform/opacity only)

## 2. Color Palette & Roles

| Token | Hex | Role |
|-------|-----|------|
| `background` | `#F5F3EF` | Page canvas — warm off-white |
| `foreground` | `#1F211F` | Primary text — near-black warm charcoal |
| `primary` | `#1F211F` | Buttons, headings — same as foreground |
| `primary-hover` | `#0d0f0e` | Primary button hover |
| `secondary` | `#6F736E` | Body text, muted UI |
| `accent` | `#B56C45` | Brand accent — warm terracotta/copper |
| `accent-hover` | `#995639` | Accent interaction state |
| `surface` | `#FFFDF9` | Cards, elevated surfaces |
| `surface-muted` | `#EBE7DF` | Subtle backgrounds, skeletons |
| `border` | `rgba(31,33,31,0.11)` | Standard borders |
| `text-primary` | `#1F211F` | Headings, strong text |
| `text-secondary` | `#6F736E` | Body, descriptions |
| `text-muted` | `#979B95` | Captions, labels |
| `success` | `#2D7A4F` | Positive states |
| `error` | `#BD4A42` | Error, destructive |
| `warning` | `#B68436` | Caution |
| `info` | `#416F86` | Informational |

**Brand accents on dark:** `#e0a681` (champagne/copper)
**Brand accents on light:** `#B56C45` (terracotta)

## 3. Typography Rules

**Font system:**
- Display/headings: System serif stack — `"Iowan Old Style", "Baskerville", "Times New Roman", serif`
- Body/UI: System sans stack — `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif`

**Hierarchy:**

| Level | Mobile | Desktop | Weight | Spacing |
|-------|--------|---------|--------|---------|
| h1 | 3.4rem | 5–7rem | 500 | -0.045em |
| h2 | 2.5rem | 3.4–4rem | 500 | -0.035em |
| h3 | 1.125rem | 1rem | 600 | -0.01em |
| Body | 13–15px | 16px | 400 | 1.55 line-height |
| Label | 9px | 9px | 700 | 0.16em tracking, uppercase |

**Rules:**
- Headings: `line-height: 1.08`, `font-weight: 500`, `letter-spacing: -0.035em`
- Labels: `.font-label` utility — 9px, 700 weight, 0.16em tracking, uppercase
- Display text: `.font-display` utility — serif family, 400 weight
- Use `…` not `...`; curly quotes `" "` not straight `"`
- Use `&nbsp;` for non-breaking spaces in measurements

## 4. Component Stylings

### Buttons
- **Shape:** Fully rounded (`border-radius: 9999px`)
- **Primary:** `bg-primary text-white`, shadow `0 8px 22px rgba(31,33,31,.16)`
- **Accent:** `bg-accent text-white`, shadow with accent tint
- **Outline:** `border border-foreground/15 bg-surface/60`
- **Sizes:** sm (h-9), md (h-11), lg (h-13)
- **States:** `hover`, `active:scale-[.965]`, `focus-visible:ring-2 ring-accent/70`
- **Loading:** Spinner via `Loader2` icon

### Cards (Product)
- **Shape:** `rounded-xl` with white background
- **Image:** 1:1 aspect ratio, `object-cover`, hover scale 1.05
- **Hover:** `shadow-card-hover` transition
- **Wishlist:** Circular heart button top-right, `bg-white/80 backdrop-blur-sm`
- **Badges:** Top-left stack — "New" (primary bg), "-X%" (error bg), "Sold Out"

### Input Fields
- **Shape:** Fully rounded (`border-radius: 9999px`)
- **Focus:** `ring-2 ring-accent/60`
- **Background:** `bg-foreground/[.055]`

### Navigation (Desktop Header)
- **Floating:** `sticky top-0`, glass material effect
- **Shape:** `rounded-[1.35rem]`
- **Active:** Underline accent bar at bottom
- **Height:** 4.25rem mobile, 4.75rem desktop

### Navigation (Mobile Bottom)
- **Position:** Fixed bottom, safe-area aware
- **Background:** `#faf8f5/90` with `backdrop-blur-xl`
- **Active:** Darker icon/text + top indicator bar
- **Items:** Home, Shop, Search, Bag, Account

## 5. Layout Principles

**Container:** `.container-shop` — `min(100% - 2rem, 1400px)` centered
- sm: `min(100% - 3rem, 1400px)`
- lg: `min(100% - 5rem, 1400px)`

**Spacing scale:**
- Section vertical padding: `py-20 md:py-28` (5rem → 7rem)
- Card gaps: `gap-4 md:gap-6`
- Content max-width: `max-w-xl` for hero text, `max-w-md` for descriptions

**Grid:**
- Products: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- Categories: `grid-cols-7` on desktop, horizontal scroll on mobile

**Rounded corners:**
- Hero/cards: `2rem` (rounded-[2rem])
- Category tiles: `1.35rem` (rounded-[1.35rem])
- Product cards: `xl` (0.75rem)
- Buttons/inputs: `full` (9999px)

## 6. Depth & Elevation

| Level | Token | Usage |
|-------|-------|-------|
| Flat | none | Background sections |
| Subtle | `shadow-sm` | Cards at rest |
| Elevated | `shadow-card` | Cards on hover |
| Floating | `shadow-dropdown` | Dropdowns, menus |
| Modal | `shadow-modal` | Modals, overlays |

**Glass material:** `.material` class — semi-transparent surface with backdrop blur
- `background: color-mix(in srgb, var(--color-surface) 78%, transparent)`
- `backdrop-filter: blur(22px) saturate(140%)`
- `border: 1px solid rgba(255, 255, 255, 0.68)`

## 7. Do's and Don'ts

### Do
- ✅ Use serif display font for headlines (`font-display`)
- ✅ Use uppercase labels with tracking (`font-label`)
- ✅ Keep generous whitespace between sections
- ✅ Use warm tones consistently
- ✅ Animate only transform and opacity
- ✅ Use `prefers-reduced-motion` for all animations
- ✅ Provide `alt` text for all images
- ✅ Use semantic HTML (`button`, `a`, `label`)
- ✅ Show loading skeletons while data fetches
- ✅ Show empty states with clear CTAs

### Don't
- ❌ Use `transition: all`
- ❌ Disable zoom (`user-scalable=no`)
- ❌ Use `outline: none` without focus-visible replacement
- ❌ Use div with onClick for navigation
- ❌ Hardcode prices without formatting utility
- ❌ Show products that don't exist in the database
- ❌ Use generic Material/Tailwind default styles
- ❌ Add excessive shadows or gradients
- ❌ Mix icon styles or weights

## 8. Responsive Behavior

**Breakpoints:**
- Mobile: < 640px (default)
- Tablet: 640px–1023px
- Desktop: 1024px+

**Mobile-specific:**
- Bottom navigation visible, desktop nav hidden
- Horizontal scroll for category tiles
- 2-column product grid
- Full-width hero with stacked layout
- Filter as bottom sheet

**Tablet:**
- 3-column product grid
- Categories in grid
- Adapted spacing

**Desktop:**
- Full header with navigation links
- 4-column product grid
- 7-column category grid
- Sidebar filters on shop page

**Safe areas:** `env(safe-area-inset-*)` for iOS notches
**Bottom nav safe:** `padding-bottom: max(4.5rem, calc(4.5rem + env(safe-area-inset-bottom)))`

## 9. Agent Prompt Guide

**Quick color reference:**
```
Background: #F5F3EF
Foreground: #1F211F
Accent: #B56C45
Surface: #FFFDF9
Muted: #EBE7DF
```

**Prompt template:**
"Build a [component] for WestHome — a premium home-interior lifestyle brand. Use warm cream backgrounds (#F5F3EF), charcoal text (#1F211F), terracotta accent (#B56C45). Serif display headings, sans-serif body. Fully rounded buttons, generous spacing, minimal depth. Apple-inspired editorial luxury aesthetic."
