const { Playlist, SearchResult, QueryType } = require('discord-player');
const ytdlp = require('../youtube/ytdlp');
const { enqueue, stateFor } = require('./enqueue');
const { botReply } = require('../bot-reply');
const logger = require('../logging');

async function loadPlaylist(player, extractor, target, voiceChannel, messageChannel, interaction, requestedBy, nodeOptions) {
    const queue = player.nodes.create(voiceChannel.guild, nodeOptions);
    const state = stateFor(queue);
    const controller = new AbortController();
    state.imports.add(controller);
    let reply, first, playlist, limited = false, failure, entries = 0;
    const tracks = [];
    const started = Date.now();
    try {
        reply = await botReply('Loading playlist. The first available song will start while the rest are added.', messageChannel, interaction);
        for await (const entry of ytdlp.playlistEntries(target, { signal: controller.signal })) {
            if (queue.deleted || controller.signal.aborted) break;
            if (++entries > 500) { limited = true; break; }
            const track = extractor.response(entry, { requestedBy }).tracks[0];
            if (!track) continue;
            if (!playlist) playlist = new Playlist(player, {
                title: entry.playlist_title || 'YouTube playlist', id: entry.playlist_id || new URL(target).searchParams.get('list'),
                description: '', thumbnail: '', url: target, source: 'youtube', type: 'playlist',
                author: { name: entry.playlist_uploader || 'YouTube', url: '' }, tracks
            });
            track.playlist = playlist;
            const single = new SearchResult(player, { query: track.url, queryType: QueryType.YOUTUBE_VIDEO, tracks: [track], extractor, requestedBy });
            const result = await enqueue(player, voiceChannel, single, nodeOptions, { signal: controller.signal });
            tracks.push(track);
            if (!first) {
                first = result;
                logger.info(`[${voiceChannel.guild.id}] Playlist first entry queued in ${Date.now() - started}ms; remaining entries loading independently`);
            }
        }
    } catch (error) {
        if (!controller.signal.aborted) failure = error;
    } finally { state.imports.delete(controller); }
    if (controller.signal.aborted || queue.deleted) {
        await reply?.edit({ content: 'Playlist loading cancelled.', allowedMentions: { parse: [] } }).catch(() => {});
        return null;
    }
    const summary = failure ? `Queued ${tracks.length} songs before playlist loading stopped: ${failure.message}`
        : tracks.length ? `Queued ${tracks.length} songs.${limited ? ' Stopped at the 500-entry limit.' : ''}${state.starting ? ' Audio is loading; playback will start when ready.' : ''}`
        : 'No playable songs were found in this playlist.';
    if (reply?.edit) await reply.edit({ content: summary.slice(0, 1900), allowedMentions: { parse: [] } });
    else await botReply(summary, messageChannel, interaction);
    if (failure) logger.warn(`[${voiceChannel.guild.id}] Playlist import stopped: ${failure.message}`);
    if (!first) return null;
    first.searchResult = new SearchResult(player, { query: target, queryType: QueryType.YOUTUBE_PLAYLIST, playlist, tracks, extractor, requestedBy });
    logger.info(`[${voiceChannel.guild.id}] Playlist import completed: ${tracks.length} tracks in ${Date.now() - started}ms`);
    return first;
}
module.exports = { loadPlaylist };
