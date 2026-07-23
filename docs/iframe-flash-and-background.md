# ExpressCheckout iframe: white flash and background color

Reference for partners who ask why the embedded checkout flashes white on load, or
why its background will not match a dark host page.

## What is happening

ExpressCheckout renders inside a cross-origin iframe. On first load the iframe paints
its own document background (white) before any custom styling applies, so against a
dark host card you see a brief white flash and, until styling lands, a white interior.

Two facts drive everything below:

1. Parent-page CSS cannot reach inside a cross-origin iframe. You cannot repaint the
   interior from the host stylesheet.
2. The only lever for the interior is `customCssUrl`. That stylesheet is fetched over
   the network from inside the iframe, so it applies a beat after the iframe first
   paints. That gap is the flash.

There is no documented "styling applied" or render-complete callback. `functionCallBackReady`
is the latest lifecycle signal the component exposes, and it fires at status change, not
at paint.

## How we resolved it

Two layers, because neither alone is enough.

### Layer 1: parent overlay (hides the flash)

A dark `<div>` sits over the checkout container, same color as the host card. We show it
the instant we call `new PayabliComponent(config)`, snapping to opaque with `transition: none`
so the iframe's white first paint never shows through. We uncover on `functionCallBackReady`
plus a 250ms buffer, fading out with `transition: opacity 0.3s ease`. The buffer gives the
fetched stylesheet time to paint before the cover lifts.

This is the real fix for the flash. The parent controls it, so it works regardless of what
the iframe does internally.

### Layer 2: interior CSS via customCssUrl (matches the background)

The injected stylesheet sets `html, body` to the dark panel color, and forces inner wrappers
(`div`, `section`, `form`, and `[class*="container|wrapper|card|panel"]`) to
`background-color: transparent !important`. Transparent wrappers mean only the dark body shows
through, so no lighter sub-block flashes in after the body darkens.

## The trap: do not set background on the buttons

We initially added `background-color` to `button` and `[class*="button|btn"]` in the injected
stylesheet. That broke Google Pay: its button is a real `<button>` element, so our rule painted
over its own `dark` style and it rendered as transparent. Apple Pay looked fine only because its
native black already matched.

Rule: the wallet buttons are configured through `buttonStyle` in the component config
(`applePay.buttonStyle`, `googlePay.buttonStyle`), not through the injected CSS. Style them there.
Do not target `button` in `customCssUrl`.

## Quick checklist for partners

- White flash on load: mask it with a parent overlay shown on render and lifted on
  `functionCallBackReady` plus a short buffer. Do not wait for a styling callback; there isn't one.
- Interior background wrong color: set `html, body` in `customCssUrl` and force inner wrappers
  transparent. Remember parent CSS cannot reach inside the iframe.
- Wallet button looks wrong (transparent, off color): check for a `button` rule in `customCssUrl`
  and remove it. Drive button appearance from `buttonStyle` in the config.
