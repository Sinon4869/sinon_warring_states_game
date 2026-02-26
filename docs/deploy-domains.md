# Domain & Environment Mapping

## Target Domains
- Production: `game.sinon.live`
- Development: `dev-game.sinon.live`

## Branch Mapping
- `main` -> `production` environment -> `game.sinon.live`
- `dev` -> `dev` environment -> `dev-game.sinon.live`

## Required GitHub Secrets
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Data Bindings (optional in current bootstrap)
Current deploy config does **not** require D1/KV/R2 IDs, so domain deployment can pass first.
When gameplay/data modules are added, bind D1/KV/R2 incrementally in `wrangler.toml`.

## Smoke Check Endpoint
- `/api/health`

CI workflow validates:
- lint
- typecheck
- deploy by branch
- smoke check to mapped domain
