# Discord music bot

YouTube playback with both slash commands (`/play`) and classic commands (`!play`). Uses Discord Player 7.2 with DAVE voice encryption, FFmpeg, and yt-dlp instead of the old youtubei/play-dl extractors. Queues are independent per server and kept in memory.

## Run with Docker

1. Keep your existing `.env` beside `compose.yaml` (see `.env.example` for the supported settings).
2. Run:

```sh
docker compose up -d --build
docker compose logs -f bot
```

Stop with `docker compose down`. The image runs as a non-root user, installs FFmpeg and yt-dlp including its JavaScript challenge solver, and uses Node 24. Secrets are supplied at runtime; `.env` and cookie files are excluded from the image. No inbound ports are needed. The host must allow outbound HTTPS, Discord WebSockets and UDP voice traffic.

## Run locally

Install Node **24.17 or newer within Node 24**, including npm. Then:

```sh
npm ci
npm run setup:youtube
npm run check
npm start
```

The setup script installs checksum-verified official yt-dlp binaries in `.tools`. FFmpeg is normally supplied by the optional `ffmpeg-static` package; alternatively install FFmpeg on PATH or set `FFMPEG_PATH`. If your npm version blocks installation scripts, approve/run the `ffmpeg-static` install script, or install FFmpeg separately. Use `YTDLP_PATH` to supply your own yt-dlp executable.

Required `.env` keys: `BOT_TOKEN`, `CLIENT_ID`. `GUILD_ID` registers slash commands immediately in that server; omit it to register globally. `REGISTER_COMMANDS=false` skips registration on subsequent starts. Existing global commands are not deleted when using guild registration.

In the Discord Developer Portal, enable **Message Content Intent** for `!` commands and chat. Invite the bot with the `bot` and `applications.commands` scopes. Give it View Channel, Send Messages, Read Message History and Embed Links in the command channel, and View Channel, Connect and Speak in the voice channel. `clean` additionally requires Manage Messages for both the caller and bot. Slash commands acknowledge immediately while media is being looked up.

## DeepSeek chat

Set `DEEPSEEK_API_KEY` in `.env` and restart the bot (Docker: `docker compose up -d --build`). Say **anime slave** anywhere in a message, case insensitive, @mention the bot, or reply to one of its messages. Ordinary messages do not call DeepSeek; recognized music commands keep priority. Other bots, webhooks and DMs cannot trigger chat.

Each request sends at most **10 messages from that channel: the trigger plus the 9 immediately before it**, in chronological order, alongside the fixed personality instructions. The bot's own replies count toward that limit. Empty messages, webhooks and other bots are excluded without reaching further back. Each message includes its text, speaker name, UTC send time, and age in seconds relative to the trigger, with at most 4,000 text characters per message. Attachments, linked pages, reply references outside the window, other channels and older history are not included in the model input. There is no saved conversation, summary, or extra memory. Without history access, only the triggering message is used. These messages are sent to DeepSeek when chat is triggered.

The bot is instructed to answer the latest message on its own when possible, and use history only for relevant follow-ups. A gap of five minutes or more is treated as a fresh topic by default; older messages are still available within the ten-message window for explicit follow-ups.

The request explicitly separates optional `history` from the `current` message to answer. Earlier messages are quoted background data, rather than extra conversation turns waiting for answers. Replies are normal Discord text. If the model copies an internal message envelope anyway, it is unwrapped before being displayed, including during streaming. Older bot replies containing such envelopes are also unwrapped before reuse as history.

The personality is blunt, sweary and abrasive, with short useful answers and no forced quirky jokes. Its prompt lives in `chatbot.js`. The default model is `deepseek-flash`, with thinking disabled for speed; override it with `DEEPSEEK_MODEL` if needed. See the [DeepSeek API reference](https://api-docs.deepseek.com/api/create-chat-completion).

Replies stream by editing a single Discord reply, at most once every 1.5 seconds during generation, followed by a final update. Output stops at Discord's 2,000-character limit. Mentions are suppressed, so generated text cannot ping people or roles. One chat request runs per channel at a time; music commands remain available during generation. API requests time out after 45 seconds, and failures replace the placeholder or mark a partial answer as interrupted. API keys and provider response bodies are not logged.

### Occasional song comments

When a requested track starts playing, it has a **1-in-10 chance** of a short DeepSeek comment in the music command channel, tagging **that track's requester**. This applies to slash/prefix play commands and individual playlist entries as they start, rather than roasting an entire playlist at once. Each queue entry gets one roll; seeking or looping the same entry does not reroll it. Tracks without a known requester are skipped.

Most comments roast the listener's taste using the song title, artist, and music/fandom stereotypes; 15% of selected comments ask for grudging respect instead. Only the title and artist are sent to DeepSeek, with no channel history or user details. Generation runs in the background with a 15-second timeout and posts one completed comment; it never delays music. Failed requests are quietly skipped, and unfinished comments are cancelled on skip, track finish, disconnect or queue deletion. Only the actual requester's mention is enabled; generated user/role/everyone mentions remain suppressed.

## Commands

| Slash | Classic | Behavior |
| --- | --- | --- |
| `/play song:<URL or name>` | `!play <URL or name>` | Play a YouTube video, search result or playlist; queue if already playing |
| `/queue` | `!queue` | Current and upcoming songs |
| `/skip` | `!skip` | Skip the current song |
| `/pause` | `!pause` | Pause (repeated calls stay paused) |
| `/resume` | `!resume` | Resume (repeated calls stay playing) |
| `/seek seconds:30` | `!seek 30` | Seek within a non-live song |
| `/shuffle` | `!shuffle` | Shuffle upcoming songs |
| `/clearqueue` | `!clearqueue` | Clear upcoming songs and keep the current song |
| `/loop mode:<choice>` | `!loop off`, `track`, `queue`, or `autoplay` | Repeat mode; autoplay searches for more songs by the artist |
| `/leave` | `!leave` | Disconnect and discard the queue |
| `/help` | `!help` | Show available music controls |
| `/clean number:10` | `!clean 10` | Delete recent messages; older than 14 days are skipped |

Join a regular voice channel first. Playback controls require the same voice channel as the bot. Prefix command names are case insensitive. Both `/playlist?list=...` and copied `/watch?v=...&list=...` links queue playlists from their first entry. Deleted/private entries are skipped. Playlist imports read up to 500 entries and report if that limit is reached; queues hold up to 500 tracks. Spotify links still resolve metadata through the Spotify extractor and play a matching YouTube recording, not Spotify audio; availability and matching can vary.

YouTube Mix/radio links (`watch?v=...&list=RD...&start_radio=1`) preserve their starting video and load related entries in the background. These links use YouTube's watch endpoint rather than a regular playlist page. Mixes are generated by YouTube and may differ from your signed-in browser; the same 500-entry import limit applies.

The bot disconnects after 60 seconds when the channel or queue is empty. Restarting the bot discards its queues. A stopped/skipped stream terminates its downloader and FFmpeg process.

## Responsiveness and livestreams

Playlist imports stream entries one at a time: the first playable entry starts audio preparation immediately, while subsequent entries continue loading in the background. They do not wait for the full playlist listing or download every song before starting. `queue` remains available while looking up the first entry, loading audio, and importing the remaining entries; it explicitly displays the current phase. Clearing or leaving cancels unfinished imports.

Other queue additions confirm as soon as their metadata is loaded, while playback starts in the background. Enqueueing during a track transition does not start another player. Repeated skip commands during loading leave upcoming tracks intact. Slash commands acknowledge immediately; classic play commands show the typing indicator during lookup.

Fresh YouTube format lookups are reused for up to ten minutes (15 seconds for live sources), with a bounded memory cache. The next non-live song is prepared and buffered during current playback, with at most two preparations running across the bot. Buffers apply backpressure at roughly 1 MB per stream side; whole tracks are not saved to disk. Changing or clearing the upcoming queue cancels unused preparation. Expired/rejected cached metadata is refreshed, and downloader process groups are terminated on cleanup.

Playback defaults to quality first, using yt-dlp's normal client selection and best available audio. Stereo 48 kHz WebM/Opus sources are demuxed and sent to Discord without decoding, resampling, equalizing or re-encoding. This preserves the original Opus packets. Sources requiring conversion, and seeking, use FFmpeg's native libopus at 160 kbps VBR with 20 ms frames; the package's default Rust encoder is bypassed. No gain boost or audio effects are applied.

Quality-first lookup can still incur YouTube's pre-roll availability wait. Next-track preparation hides that wait during playback. `YOUTUBE_FAST_START=true` explicitly opts into the lower-quality `mweb`/ad-playback-context source, which may reduce startup delay but often exposes only a combined AAC/video format. The fast profile falls back to normal clients if extraction or media startup fails. Cookie-authenticated sessions always use normal clients. See [yt-dlp's extractor options](https://github.com/yt-dlp/yt-dlp#extractor-arguments).

Active livestream URLs and live search results can be queued normally. They display `Live`, start from the current broadcast position when their turn arrives, are not recorded ahead, and cannot be seeked. Scheduled streams that have not started return an explanatory error. A current public livestream started in about 1.7 seconds and continued playing in the regression check.

## YouTube authentication and updates

Public videos normally work without cookies. YouTube can still restrict videos or block a hosting IP. No extractor can guarantee every video on every hosting provider. If YouTube asks for login, configure `YOUTUBE_COOKIES_FILE` with a fresh **Netscape-format** cookie file exported for yt-dlp; the legacy `YOUTUBE_COOKIE` header is no longer used. Follow [yt-dlp's YouTube guidance](https://github.com/yt-dlp/yt-dlp/wiki/Extractors#youtube), and keep cookie files private.

For Docker, uncomment the cookie bind mount in `compose.yaml`, place the file at `./cookies.txt`, and set `YOUTUBE_COOKIES_FILE=/run/secrets/youtube-cookies` in `.env`. For local use, set that variable to the full path. The bot gives each yt-dlp process a private temporary copy and removes it afterwards, so read-only mounts work and the original cookie file stays unchanged.

YouTube changes frequently. yt-dlp is pinned to **2026.10.26** for reproducible setup. To update Docker, use `docker compose build --build-arg YTDLP_VERSION=<release>` and recreate the container. For local setup, update `VERSION` in `scripts/install-ytdlp.js`, then run `npm run setup:youtube`. Node is explicitly enabled as yt-dlp's JS runtime; Docker installs `yt-dlp[default]` to include the matching EJS scripts ([official setup guide](https://github.com/yt-dlp/yt-dlp/wiki/EJS)).

## Verification

```sh
npm test
npm run check
```

Tests cover command dispatch/replies, real queue context, pause/resume, input validation, playlist conversion, display limits and downloader lifecycle. `check` verifies configuration and executable/native dependencies without logging in. For an authorized live test, `node scripts/live-smoke.js <voice-channel-id>` logs in, registers commands, plays two YouTube lookups, exercises controls, posts replies in that voice channel's text chat, then disconnects. It requires a server ID matching `GUILD_ID` when set. Stop other instances before running it.

`node scripts/live-background.js <voice-channel-id>` verifies a real playlist while deliberately holding its remaining entries back until first-track audio playback starts. It checks that the queue stays visible throughout lookup/startup, audio playback progresses before the playlist import finishes, and the other four entries append afterwards. The artificial hold is confined to this test script.

`node scripts/live-quality.js <voice-channel-id>` verifies two real Opus sources for 15 seconds each, checks for audio-resource starvation, confirms no additional encoder is inserted, and exercises the native encoding fallback during seek. Automated packet checks do not replace a listener's assessment of sound quality.

Dependency audit: the current upstream extractor bundle includes a `file-type` advisory affecting its ASF attachment parser, and the voice package includes an esbuild development-server advisory. This bot registers only the Spotify and custom YouTube extractors and runs no attachment parser or development server. The vulnerable HTTP dependency was updated to Undici 6.29.1. Recheck `npm audit` when updating upstream packages; do not apply its suggested downgrade to obsolete Discord Player versions.
