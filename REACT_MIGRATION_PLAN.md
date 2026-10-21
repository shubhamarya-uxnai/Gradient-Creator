# Gradient Studio React migration

## Decision

Gradient Studio will become a React application that imports the shared BA
design-system package. Product code will not import Figma property names or
style implementation details directly. It will consume a small semantic UI
layer owned by this app.

```text
Gradient Studio feature code
        -> product UI primitives (stable semantic props)
        -> component map / adapter
        -> @ba-design-system/react
        -> shared tokens and generated styles
```

The component map is the replacement seam. For example, a `GradientSelect`
can initially map to `Button` with a trailing caret and later map to the
design-system `Dropdown` without changing the gradient editor, export flow, or
settings state.

## Proposed structure

```text
src/
  app/                 application shell and routes
  features/
    editor/            gradient state, canvas, transport
    controls/          editor controls and field schemas
    export/            export jobs and progress UI
    appearance/        theme/settings UI
  ui/
    components.ts      the only design-system mapping file
    primitives/        semantic product wrappers
    icons.tsx          icon mapping and accessibility defaults
  styles/
    app.css            layout only; no component visuals
  main.tsx
```

`ui/components.ts` should expose semantic components such as `ActionButton`,
`IconAction`, `Field`, `Select`, `Surface`, and `SegmentedControl`. Feature
code should never need to know whether `Select` is currently implemented with
`Button`, `InputField`, or a future shared `Dropdown`.

## Safe introduction of new components

New design-system components must be additive and versioned. A consumer must
not import a component until its package export, runtime implementation,
generated CSS, type declarations, and contract tests are all present in the
same release. The app's component map should use an explicit capability check
or a pinned package version, and fail with a visible development-time error if
the requested component is unavailable. It should not silently render a
half-compatible fallback in production.

Recommended release gates:

1. Build the design-system package from its source/Figma snapshots.
2. Run typecheck, contract tests, and a rendered component smoke test.
3. Publish an immutable version (for example `0.5.0`), never mutate an
   existing tag.
4. Update Gradient Studio's dependency once, in `ui/components.ts` or its
   package manifest.
5. Run visual regression screenshots for the editor, settings, and export
   states.

## Flaws and changes to the original idea

### 1. Direct replacement is too weak

Replacing `Button` with `Dropdown` only works if the old and new components
have identical behavior, keyboard semantics, focus management, and value
contracts. A dropdown is not merely a button with a caret. The adapter must
translate stable product props (`value`, `options`, `onChange`) into the
current implementation.

### 2. CSS inheritance is not component inheritance

Loading updated CSS can restyle the app, but it cannot safely add behavior,
ARIA relationships, portal placement, or keyboard handling. New component
families must be imported as React code and tested as behavior, not treated as
theme overrides.

### 3. Floating or stateful components need ownership rules

Dropdowns, dialogs, tooltips, and popovers need a shared overlay/focus policy.
The migration should establish one portal root, escape-key handling, focus
return, outside-click behavior, and z-index tokens before adding them.

### 4. A moving design-system dependency can destabilize the editor

Do not track `main`, a mutable CDN URL, or a floating workspace range for the
production app. Pin immutable releases and update deliberately. Local linking
is useful for development, but CI and production must resolve the exact same
artifact.

### 5. Figma parity needs a contract, not a promise

The design system can guarantee tokens, variants, and accessibility contracts;
it cannot guarantee that every product layout remains pixel-identical after a
component update. Keep layout and animation decisions in Gradient Studio and
use visual snapshots to detect meaningful changes.

### 6. Migration should preserve the rendering engine

The canvas, gradient math, GIF/WASM export, and local-only behavior should be
kept as feature services while the DOM shell is migrated. Rewriting those at
the same time would make regressions difficult to isolate.

## Definition of done for the rebuild

- No product UI markup remains in the monolithic `index.html`.
- Gradient rendering and every export format behave as before.
- All shared visual components come from `@ba-design-system/react` through the
  product mapping layer.
- No feature imports generated CSS classes or Figma property names directly.
- A design-system component update can be adopted in one mapping/dependency
  change, with contract and visual checks catching incompatibilities.
- The Framer wrapper consumes the built React app at an immutable release.
