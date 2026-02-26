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

## Required Cloudflare Resource IDs
Update `wrangler.toml` placeholders before first deploy:
- `REPLACE_WITH_DEV_D1_ID`
- `REPLACE_WITH_PROD_D1_ID`
- `REPLACE_WITH_DEV_KV_ID`
- `REPLACE_WITH_PROD_KV_ID`

## Smoke Check Endpoint
- `/api/health`

CI workflow validates:
- lint
- typecheck
- deploy by branch
- smoke check to mapped domain
