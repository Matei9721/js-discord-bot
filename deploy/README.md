# Server deployment

Install this independent stack in a `js-discord-bot/` directory beside the
server's other deployment directories. It contains deployment configuration
only; the app is built by GitHub Actions and pulled from GHCR.

## Publish

`.github/workflows/build-push.yml` tests pull requests and pushes to `main`.
After the tests pass on `main`, it publishes Linux/amd64 images at:

- `ghcr.io/matei9721/js-discord-bot:latest`
- `ghcr.io/matei9721/js-discord-bot:sha-<full-commit-sha>`

Manual workflow dispatch also publishes when run against `main`. Branch runs
cannot publish. The workflow uses the automatic `GITHUB_TOKEN` with
`packages: write`; no Discord, DeepSeek, or SSH credentials are used by the build.
The image contains no `.env`, cookies, Git metadata, or local tooling.

## Initial setup

Copy `docker-compose.yml` into the production directory and create `.env` next
to it with permissions `0600`. See the repository's `.env.example` for supported
settings. At minimum supply `BOT_TOKEN`, `CLIENT_ID`, and `DEEPSEEK_API_KEY` for
chat; set `GUILD_ID` for immediate guild command registration. Do not copy local
Windows executable paths into the server environment.

The container has its own Compose bridge network and needs outbound HTTPS,
Discord WebSockets, and UDP voice traffic. It needs no host port, Caddy route,
DNS record, database, or persistent volume. Logs rotate at 10 MB with three files.
Only one deployment of this bot token should run at a time.

After the image exists and registry access is configured:

```sh
cd /path/to/deployments/js-discord-bot
docker compose pull bot
docker compose up -d bot
docker compose ps
docker compose logs --tail 50 bot
```

Verify Discord login, a real voice/music request, a chat mention, and the requester
tag on a selected song comment. A running container alone does not verify voice
playback. Restarting loses the in-memory music queue and does not preserve chat history.

## Automatic updates

The server's existing `registry-updater` handles signed package-published webhooks:

1. Register `https://registry-updater.selfhaven.eu/update` as an active JSON
   webhook for the repository's **Packages** events, using the existing
   `WEBHOOK_SECRET` from the updater's server-side `.env`.
2. Add this read-only mount to `registry-updater/docker-compose.yml`:
   `../js-discord-bot:/absolute/host/path/to/deployments/js-discord-bot:ro`.
   The destination must match the actual host path recorded by Compose.
3. Recreate only the webhook service to apply the mount:
   `docker compose up -d --no-deps --force-recreate webhook` from its directory.
4. Start the bot stack once. Subsequent package notifications find it through the
   `com.centurylinklabs.watchtower.enable=true` label and its Compose working directory.

The updater checks every running opted-in service and recreates services whose
image changed. It can therefore also update another opted-in app if a new image
is waiting. It cannot discover a bot that has never been started or is stopped.
Do not run its `--dry-run` as a read-only check: it still pulls images and may
prune its log.

GHCR packages initially publish as private. A public image permits anonymous
pulls; private images require a valid `read:packages` credential with access to
this package. Package visibility and pull access must be confirmed before first
launch. Keep registry credentials separate from bot runtime credentials.

## Roll back

Record the previous full commit SHA before an update. Change the production
compose image to `ghcr.io/matei9721/js-discord-bot:sha-<previous-full-sha>` and
remove the updater label while holding the rollback. Pull and recreate only the
bot service. Restore `:latest` and the updater label when resuming normal updates.
