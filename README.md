# RANDOM Overlay Studio — web edition

OBS overlay for `random_gtv`, hosted entirely on GitHub Pages. The overlay renders in the browser; no Python, PowerShell, local background service, Vercel account or Twitch password is needed.

## Connect OBS

- Dashboard: https://randomgtv.github.io/random-overlay-studio/
- Combined overlay: https://randomgtv.github.io/random-overlay-studio/overlay.html
- Top only: https://randomgtv.github.io/random-overlay-studio/overlay.html?bars=top
- Bottom only: https://randomgtv.github.io/random-overlay-studio/overlay.html?bars=bottom

Add a **Browser Source**, disable **Local file**, paste the overlay URL, and match your canvas dimensions (1920 × 1080 or 1280 × 720). The middle is transparent. Use the combined source or separate top/bottom sources, not both together.

## Automatic updates

Every push to `main` runs the tests, builds the site, and deploys with GitHub Actions. The overlay checks published settings every 15 seconds and the code version every 60 seconds. GitHub deployment and CDN propagation add delay. Code releases reload the Browser Source automatically; a reload can briefly interrupt the overlay. Existing local v7 apps do not update themselves: change the OBS source to the hosted URL once when you are ready.

Published settings live in `config.json`. Changing a local file alone does not publish it: commit and push the change to GitHub. The build validates settings and adds versioned script/style URLs so OBS does not keep old code from its cache.

## Dashboard settings

Controls are a local draft preview. **Download config.json**, open **Edit settings on GitHub**, replace that file's content, and commit to `main`. The successful deployment applies those settings to every source using the published URL. You can also ask Codex to edit and publish the settings here. The static dashboard cannot save directly to the server; this deliberately avoids collecting GitHub credentials in a public webpage. Do not put passwords, tokens or private messages in published settings.

Supports eight existing theme presets, automatic game themes, per-game assignments, three density levels, reward artwork, upcoming campaigns, animation and reduced-motion preferences, optional bottom bar, rotating messages, manual category selection and manual reward schedules. Manual schedule dates must include a timezone, and image URLs must use the Twitch image CDN. Legacy local settings can be imported into the preview if they identify the same channel; omitted web channel fields use the defaults.

## Live data and failure behavior

The browser refreshes the channel every minute and campaigns every five minutes using public third-party providers. It checks matching channel restrictions and campaign/drop dates. Campaign data older than two hours and game categories older than five minutes do not produce automatic reward cards. Branding remains visible when there are no matching rewards or a provider is unavailable. The public channel avatar can remain visible after live statistics expire.

The app does not independently verify that Drops are enabled, does not enable Drops, and does not track individual viewer progress or claims. A manual Drops-enabled confirmation applies only to the currently detected category. Confirm campaign eligibility and requirements in Twitch before advertising rewards. Public-provider freshness and availability are not guaranteed. A channel can be live with zero supported matching reward cards.

## Development

Node.js 22+; no third-party npm packages required.

```sh
npm test
npm run build
node scripts/serve.mjs dist
```

Open http://127.0.0.1:9488/. Configure repository **Settings → Pages → Source → GitHub Actions** once. The tracked workflow handles later deployments. Theme backgrounds and the channel avatar were retained from the existing Windows package; the text and graphics are now HTML/CSS. The original Windows package is unchanged.

## Data and artwork sources

- Public channel lookup: https://api.ivr.fi/v2/twitch/user?login=random_gtv
- Public campaign mirror: https://github.com/SunkwiBOT/twitch-drops-api
- Alternate campaign API: https://twitch-drops-api.sunkwi.com/v2/drops
- Reward/identity images: https://static-cdn.jtvnw.net/
- Channel identity and avatar: https://www.twitch.tv/random_gtv
- Theme art: existing generated assets; original prompts are in `assets/themes/GENERATED-ART-PROMPTS.json`.

Not affiliated with Twitch, the data providers or game publishers. No embedded test campaigns or credentials are published.
