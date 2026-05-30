# AIVITA — Design System: Soft Clay Matte

This is the **canonical** design system. Some older screens (notably the onboarding flow) still use a
legacy "Air / pink-gradient + serif + orb-background" look — that is **not** canon and should be
migrated to Soft Clay Matte when touched. When in doubt, match Soft Clay Matte.

## Tokens

```
Background:   #f4f3ef
Card:         #ffffff,  border #e8e4dc,  radius 18px
Patient accent: #9c5e6c   (soft accent bg #f3e7ea)
Doctor accent:  #6BA3D6
Semantic:
  green   #3a7a4a  on bg #d4e8d8
  blue    #6BA3D6  on bg #d4dff0
  purple  #8b6aae  on bg #e0d8f0
  orange  #e8873a  on bg #fff3cd
  red     #dc3545  on bg #fde8e8
Text:   #2a2540 (primary), #6a6580 (secondary), #9a96a8 (muted)
Payment brand: Click #00B4E6, Payme #33CCCC, Uzum #7B2D8E
```

## Typography & layout

- Font: **Outfit** (weights 300–800). Load from Google Fonts; system-ui fallback.
- Mobile-first. Content max-width **480px**, centered.
- Soft, matte shadows (e.g. `0 8px 30px rgba(60,50,60,.08)`) — not hard drop shadows.
- Rounded everything: cards 18px, buttons 14–16px, pills 20px.
- Avoid legacy elements: no `OrbBackground`, no big pink→mint gradients, no `font-serif italic` as a primary style.

## Component conventions

- Cards: white, 1px `#e8e4dc` border, 18px radius, generous padding (~14–18px).
- Primary CTA: full-width, height ~54px, accent fill, white text, soft accent-colored shadow.
- Icons: soft "clay" feel; colored rounded tiles behind glyphs using the semantic bg/fg pairs.
- Buttons should carry tooltip hints where the action isn't obvious.
- Logos: PNG with transparent background; never apply `mix-blend-mode`.

## First-run / hook principle (north star)

The onboarding payoff is the single most important screen. It must:
- show the AI visibly working (a short "analyzing your answers" beat) before revealing results,
- display **personalized** data computed from the user's anamnesis (Health Score, health-age vs real-age, factor breakdown) — never hardcoded placeholders,
- include an **AI-generated** insight line (via claude-sonnet) naming the person's specific growth zone and the concrete next step,
- offer 2–3 personalized next-action cards so the user falls straight into the app.
