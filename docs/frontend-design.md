
---

# 2. `docs/frontend-design.md`

This is the **most important addition** for avoiding generic AI UI.

```md
# Frontend Design System

## Design Direction

The product should feel like a modern AI-native talent platform.

Use the provided reference screenshots in:

docs/design-reference/

as visual references.

Study them for:

- spacing
- typography
- layout density
- navigation
- card proportions
- border treatment
- information hierarchy
- candidate presentation
- search/filter interaction
- whitespace

Do NOT copy Mercor branding, logo, proprietary assets, or exact copy.

Use the references for design language, not cloning.

---

# Overall Feel

The UI should feel:

- minimal
- premium
- calm
- professional
- modern
- AI-native
- information-dense without feeling crowded
- editorial rather than enterprise-heavy

Avoid the appearance of a generic admin dashboard.

---

# Visual Principles

Prioritize:

1. Typography
2. Spacing
3. Alignment
4. Information hierarchy
5. Whitespace
6. Subtle borders
7. Consistent interaction patterns

Do not rely on:

- gradients
- glassmorphism
- glowing elements
- huge shadows
- excessive rounded cards
- decorative illustrations
- excessive animation

---

# Color

Use a restrained neutral palette.

Base:

- white / near-white backgrounds
- near-black primary text
- muted gray secondary text
- subtle gray borders
- very light surfaces

Use one restrained accent color for:

- primary actions
- active states
- important highlights
- links

Do not use many competing accent colors.

Status colors may be used when semantically necessary:

- success
- warning
- error
- information

Do not turn every status into a brightly colored pill.

---

# Typography

Use a modern sans-serif font.

Prefer:

Inter

unless an existing project font is already configured.

Hierarchy should be created mostly through:

- font size
- font weight
- line height
- spacing

Do not use huge headings inside dashboard screens.

Suggested scale:

Display:
48px+

Page title:
28–32px

Section title:
18–20px

Body:
14–16px

Metadata:
12–14px

The actual values can be adjusted based on the reference screenshots.

---

# Spacing

Use a consistent spacing system.

Prefer Tailwind's spacing scale.

Important principle:

Give content room to breathe.

Do not fill every pixel.

Use larger spacing between conceptual sections and smaller spacing between related elements.

---

# Borders

Prefer subtle 1px borders.

Cards should generally rely on:

border + whitespace

rather than:

heavy shadows + large rounded corners

---

# Border Radius

Use moderate rounding.

Avoid:

- extremely rounded cards
- pill-shaped everything

Pills should primarily represent:

- tags
- statuses
- compact metadata

---

# Navigation

Use a compact left sidebar for authenticated desktop experiences.

Conceptually:

```text
┌────────────────┐
│ ATCON          │
│                │
│ Overview       │
│ Jobs           │
│ Candidates     │
│ Pipeline       │
│ Interviews     │
│                │
│                │
│ Settings       │
│                │
│ User           │
└────────────────┘