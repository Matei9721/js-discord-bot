const { useMainPlayer, SearchResult, QueryType } = require('discord-player');
const { performance } = require('node:perf_hooks');
const { botReply } = require('../bot-reply');
const { normalizeQuery, isPlaylistQuery, YtDlpExtractor } = require('../youtube/YtDlpExtractor');
const { enqueue, stateFor } = require('./enqueue');
const { loadPlaylist } = require('./loadPlaylist');
const logger = require('../logging');
const { qualityOptions } = require('../audio/quality');
async function play(input, voiceChannel, messageChannel, interaction, requestedBy = interaction?.user) {
    if (!voiceChannel) throw new Error('Join a voice channel first.');
    input = input.trim().replace(/^<(.+)>$/, '$1');
    if (!input) throw new Error('Usage: !play <YouTube URL or song name>');
    const started = performance.now();
    const player = useMainPlayer();
    const nodeOptions = {
        ...qualityOptions,
        metadata: { messageChannel },
        leaveOnEmpty: true, leaveOnEmptyCooldown: 60000,
        leaveOnEnd: true, leaveOnEndCooldown: 60000,
        connectionTimeout: 30000, bufferingTimeout: 1000,
        disableFallbackStream: true, maxSize: 500, maxHistorySize: 50
    };
    if (!/^https:\/\/open\.spotify\.com\//i.test(input)) {
        const target = normalizeQuery(input);
        if (isPlaylistQuery(target)) {
            return loadPlaylist(player, player.extractors.resolve(YtDlpExtractor.identifier), target,
                voiceChannel, messageChannel, interaction, requestedBy, nodeOptions);
        }
    }
    const pendingQueue = player.nodes.create(voiceChannel.guild, nodeOptions);
    const state = stateFor(pendingQueue);
    const version = state.version;
    state.pendingSearches++;
    let searchResult;
    try {
    if (/^https:\/\/open\.spotify\.com\//i.test(input)) {
        searchResult = await player.search(input, { requestedBy });
    } else {
        normalizeQuery(input);
        // Preserve the playlist query and surface extractor errors directly.
        const extractor = player.extractors.resolve(YtDlpExtractor.identifier);
        const response = await extractor.handle(input, { requestedBy });
        searchResult = new SearchResult(player, { ...response, query: input, queryType: QueryType.AUTO, extractor, requestedBy });
    }
    if (pendingQueue.deleted || state.version !== version) throw new Error('Song lookup was cancelled.');
    const result = await enqueue(player, voiceChannel, searchResult, nodeOptions);
    const count = searchResult.playlist ? searchResult.tracks.length : 1;
    await botReply(count > 1 ? `Queued ${count} songs.` : `Queued: ${result.track.title}`.slice(0, 1900), messageChannel, interaction);
    logger.info(`[${voiceChannel.guild.id}] Queued ${count} track(s) in ${Math.round(performance.now() - started)}ms`);
    return result;
    } finally { state.pendingSearches--; }
}
module.exports = { play };
