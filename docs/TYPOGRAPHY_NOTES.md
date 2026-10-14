# Typography pass

This pass keeps the existing frontend-only architecture and adds optional per-block typography overrides.

- Supported text blocks: paragraph, heading, quote, bullet/numbered list items and callout.
- Stored properties: `fontFamily`, `fontSize`, `fontWeight` in `plan.typography[blockId]`.
- Existing plans without `typography` remain valid.
- Suggested fonts are offered in the inspector, but the font-family input accepts a custom CSS font-family name/stack.
- Custom fonts are not uploaded or bundled. A custom family renders on another device only when that font is available there; otherwise the browser uses its fallback.
- Preview and shared snapshots use the same PlanRenderer and therefore preserve the typography settings.
