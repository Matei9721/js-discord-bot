const { Player } = require('discord-player');
const { SpotifyExtractor } = require('@discord-player/extractor');
const { EmbedBuilder } = require('discord.js');
const { YtDlpExtractor } = require('./youtube/YtDlpExtractor');
const { botMessage } = require('./bot-reply');
const logger = require('./logging');
const { prefetchNext, forget } = require('./youtube/prefetch');
async function startPlayer(client) {
    const player = new Player(client, { ffmpegPath: process.env.FFMPEG_PATH, connectionTimeout: 30000, skipFFmpeg: true });
    player.on('error', error => logger.error(`[Player] ${error.message}`));
    await player.extractors.register(YtDlpExtractor, {});
    await player.extractors.register(SpotifyExtractor, {});
    for (const event of ['playerStart', 'audioTrackAdd', 'audioTracksAdd']) player.events.on(event, prefetchNext);
    for (const event of ['connectionDestroyed', 'queueDelete']) player.events.on(event, forget);
    const send = (queue, body) => {
        if (queue.metadata?.messageChannel) botMessage(body, queue.metadata.messageChannel).catch(error => logger.warn(`[Player notification] ${error.code || error.name}`));
    };
    player.events.on('playerStart', (queue, track) => {
        logger.info(`[${queue.guild.id}] Playback started: ${track.title}`);
        const embed = new EmbedBuilder().setColor('#0099ff').setTitle(track.title.slice(0, 256))
            .setURL(track.url).setAuthor({ name: 'Now playing' })
            .setDescription(queue.tracks.size ? `Next: ${queue.tracks.at(0).title}`.slice(0, 4096) : 'Queue is empty')
            .addFields({ name: 'Song duration', value: track.live ? 'Live' : track.duration || 'Unknown' });
        if (track.thumbnail) embed.setThumbnail(track.thumbnail);
        send(queue, { embeds: [embed] });
    });
    for (const event of ['playerError', 'error']) {
        player.events.on(event, (queue, error) => {
            logger.error(`[${queue.guild.id}][${event}] ${error.message}`);
            send(queue, 'Playback failed for this track. Try another video or check the bot logs and YouTube cookies configuration.');
        });
    }
    return player;
}
module.exports = { startPlayer };
