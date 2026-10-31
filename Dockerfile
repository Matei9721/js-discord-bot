FROM node:24-bookworm-slim

ARG YTDLP_VERSION=2026.10.26
ENV NODE_ENV=production \
    PYTHONDONTWRITEBYTECODE=1 \
    YTDLP_PATH=/opt/yt-dlp/bin/yt-dlp \
    FFMPEG_PATH=/usr/bin/ffmpeg

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates ffmpeg python3 python3-venv \
    && python3 -m venv /opt/yt-dlp \
    && /opt/yt-dlp/bin/pip install --no-cache-dir "yt-dlp[default]==${YTDLP_VERSION}" \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
# FFmpeg comes from apt; native DAVE binaries are shipped as optional packages.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --chown=node:node . .
USER node
CMD ["node", "index.js"]
