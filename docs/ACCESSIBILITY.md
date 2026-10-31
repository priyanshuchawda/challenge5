# Accessibility

The interface uses semantic sections and headings, labelled form controls, visible focus styles,
status announcements for saves and errors, and modal dialogs with keyboard handling. Text contrast
was improved for secondary labels and status indicators; color is paired with text or icon labels
for task priority and workflow status.

Playwright runs axe against the core planning views at desktop (1440px) and narrow mobile (390px)
widths. The current automated scan reports no axe violations in those tested views. It does not
prove full WCAG conformance. A manual screen-reader and full keyboard-only review remains useful
before treating accessibility as fully verified.

To reproduce the automated scan, run:

```sh
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```
