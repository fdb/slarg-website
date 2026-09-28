# AGENTS.md

SLARG website (slarg.be): Eleventy, Decap CMS, hosted on Netlify. Images live on Cloudflare Images as `slarg/<id>`; templates append the variant (`/public`, `/medium`).

## Git and deploy

- Commit directly to `main`; no feature branches or pull requests.
- Decap CMS also commits to `main`: `git pull --rebase` before pushing.
- Netlify deploys every push to `main`. Verify by fetching the changed page on https://slarg.be.

## Local build

- `npx @11ty/eleventy --output=<dir>` builds the site without touching `_site`.
- `.env` holds `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_HASH` (see `.env.example`).
