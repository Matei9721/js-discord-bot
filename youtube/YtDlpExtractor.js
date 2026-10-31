const { BaseExtractor, Track, Playlist, QueryType } = require('discord-player');
const ytdlp = require('./ytdlp');
const { sourceStream } = require('../audio/quality');

function youtubeURL(query) {
    try {
        const url = new URL(query);
        return ['https:', 'http:'].includes(url.protocol) &&
            (url.hostname === 'youtu.be' || url.hostname === 'youtube.com' || url.hostname.endsWith('.youtube.com'));
    } catch { return false; }
}
function normalizeQuery(query) {
    const text = query.trim().replace(/^<(.+)>$/, '$1');
    if (!text) throw new Error('Provide a YouTube URL or a song name.');
    if (youtubeURL(text)) {
        const url = new URL(text);
        if (url.searchParams.has('list')) {
            const list = url.searchParams.get('list');
            if (list.startsWith('RD')) {
                const seed = url.searchParams.get('v') || (url.hostname === 'youtu.be' ? url.pathname.slice(1) : null)
                    || /^RD([\w-]{11})$/.exec(list)?.[1];
                if (!/^[\w-]{11}$/.test(seed || '')) throw new Error('Copy the full YouTube Mix link, including its starting video (watch?v=...&list=...).');
                // Radio mixes use the watch/next endpoint and require a seed.
                return `https://www.youtube.com/watch?v=${seed}&list=${encodeURIComponent(list)}&start_radio=1`;
            }
            // YouTube's Share button commonly supplies watch?v=...&list=....
            return `https://www.youtube.com/playlist?list=${encodeURIComponent(list)}`;
        }
        return url.toString();
    }
    if (/^[a-z][a-z\d+.-]*:|^\/\//i.test(text)) throw new Error('Use a YouTube URL or search by song name.');
    return `ytsearch1:${text}`;
}
function isPlaylistQuery(query) {
    return youtubeURL(query) && new URL(query).searchParams.has('list');
}
function duration(seconds) {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    return value >= 3600 ? `${Math.floor(value / 3600)}:${String(Math.floor(value / 60) % 60).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
        : `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}
class YtDlpExtractor extends BaseExtractor {
    static identifier = 'com.js-discord-bot.ytdlp';
    processes = new Set();
    async validate(query, type) {
        return youtubeURL(query) || [QueryType.AUTO, QueryType.AUTO_SEARCH, QueryType.YOUTUBE_SEARCH, QueryType.YOUTUBE_VIDEO, QueryType.YOUTUBE_PLAYLIST].includes(type);
    }
    async handle(query, context) {
        const target = normalizeQuery(query);
        const info = await ytdlp.metadata(target, { limit: 501 });
        if (info.entries?.length > 500 && !target.startsWith('ytsearch')) throw new Error('This playlist has more than 500 entries. Queue a smaller playlist.');
        if (info.live_status === 'is_upcoming') throw new Error('This livestream has not started yet. Try again when it is live.');
        return this.response(info, context, target);
    }
    response(info, context, target = '') {
        const isPlaylist = Array.isArray(info.entries) && !target.startsWith('ytsearch');
        const playlist = isPlaylist ? new Playlist(this.context.player, {
            title: info.title || 'YouTube playlist', description: '', thumbnail: '', type: 'playlist', source: 'youtube',
            id: info.id, url: info.webpage_url || target, author: { name: info.uploader || 'YouTube', url: '' }, tracks: []
        }) : null;
        const tracks = (info.entries || [info]).filter(entry => entry && /^[\w-]{11}$/.test(entry.id) &&
            !['private', 'premium_only', 'subscriber_only', 'needs_auth'].includes(entry.availability) &&
            !/^\[(Private|Deleted) video\]$/.test(entry.title)).map(entry => {
            const track = new Track(this.context.player, {
                title: entry.title || entry.id, description: '', author: entry.uploader || entry.channel || 'YouTube',
                url: `https://www.youtube.com/watch?v=${entry.id}`, thumbnail: `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
                duration: entry.is_live || entry.live_status === 'is_live' ? 'Live' : duration(entry.duration),
                views: entry.view_count || 0, requestedBy: context.requestedBy,
                source: 'youtube', queryType: QueryType.YOUTUBE_VIDEO, live: Boolean(entry.is_live || entry.live_status === 'is_live')
            });
            track.extractor = this;
            track.playlist = playlist;
            return track;
        });
        if (playlist) playlist.tracks = tracks;
        return this.createResponse(playlist, tracks);
    }
    async stream(track) {
        const queue = track.queue;
        if (queue?.deleted) throw new Error('Playback was cancelled.');
        const prefetched = await require('./prefetch').take(queue, track);
        if (queue?.deleted) { prefetched?.destroy(); throw new Error('Playback was cancelled.'); }
        if (prefetched && !prefetched.destroyed) return sourceStream(prefetched, ytdlp.audioInfo(prefetched));
        const info = await ytdlp.prepare(track.url);
        if (queue?.deleted) throw new Error('Playback was cancelled.');
        if (info.live_status === 'is_upcoming') throw new Error('This livestream has not started yet.');
        track.live = Boolean(info.is_live || info.live_status === 'is_live');
        track.duration = track.live ? 'Live' : duration(info.duration);
        const stream = await ytdlp.audio(track.url, this.processes);
        return sourceStream(stream, ytdlp.audioInfo(stream));
    }
    async bridge(track) {
        const result = await this.handle(`${track.title} ${track.author}`, { requestedBy: track.requestedBy });
        return result.tracks[0] ? this.stream(result.tracks[0]) : null;
    }
    async getRelatedTracks(track, history) {
        const info = await ytdlp.metadata(`ytsearch5:${track.author} music`);
        const seen = new Set([track.url, ...(history?.tracks.toArray() || []).map(item => item.url)]);
        const response = this.response(info, { requestedBy: track.requestedBy }, 'ytsearch5:');
        return this.createResponse(null, response.tracks.filter(item => !seen.has(item.url)));
    }
    async deactivate() { await ytdlp.stopAll(); this.processes.clear(); }
}
module.exports = { YtDlpExtractor, youtubeURL, normalizeQuery, isPlaylistQuery, duration };
