# Third-party attribution

The `rhine` skin is a port of
[`Rad-Weed/rhine-lab-motion`](https://github.com/Rad-Weed/rhine-lab-motion),
which is MIT licensed:

```
MIT License

Copyright (c) 2026 Rad-Weed

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

That licence applies to the visual system and code `src/skins/rhine/` derives
from it. If you remove the skin, you may remove this file; if you keep it, the
notice must stay with it.

The `lone-trail` skin is original to this template. Its visual vocabulary was
reconstructed from a design-system reference, and it ships no third-party
artwork.

The `terminal`, `paper` and `static` skins are original to this template as well.
They are set in **Saira**, a variable font by Omnibus-Type, under the SIL Open
Font License 1.1. The subset that ships is
[`public/fonts/Saira.woff2`](public/fonts/Saira.woff2) — 86 kB, Latin plus the
punctuation the skins use, with both the `wght` (100–900) and `wdth` (50–125)
axes preserved, because the design depends on setting wide Latin above
normal-width Chinese. The licence text is vendored beside it at
[`public/fonts/Saira-OFL.txt`](public/fonts/Saira-OFL.txt) and must stay with the
font. Saira is not derived from, and does not reproduce, any Hypergryph asset;
the skins' type is a licensed open font used in a similar spirit.

Nothing else here is vendored: there are no other bundled fonts, images, or
scripts. The three runtime dependencies (`astro`, `@astrojs/rss`, `zod`) are
consumed as packages, not copied.
