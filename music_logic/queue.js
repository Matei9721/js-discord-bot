const {useQueue} = require("discord-player");
const {botReply} = require("../bot-reply");
const {EmbedBuilder} = require("discord.js");
const {generateSongList} = require("../utilities/songListOperations");
const {stateFor} = require('./enqueue');

async function queue(messageChannel, interaction) {
    // Get the current queue
    const queue = useQueue();

    if (!queue) {
        return botReply('This server does not have an active player session.', messageChannel, interaction);
    }
    const state = stateFor(queue);
    // Get the current track
    const currentTrack = queue.currentTrack || state.loadingTrack;

    // Get the upcoming tracks
    const upcomingTracks = queue.tracks.toArray();
    if (!currentTrack && !upcomingTracks.length && !state.imports.size && !state.pendingSearches) {
        return botReply('This server does not have an active player session.', messageChannel, interaction);
    }

    const Embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setAuthor({ name: 'Songs in queue:' })
        .setDescription(`${queue.getSize()} songs waiting.${state.imports.size ? ' More playlist entries are loading in the background.' : ''}${state.pendingSearches ? ' Looking up your song…' : ''}`)
        .setTimestamp();
    if (currentTrack) {
        const label = queue.node.isPaused() ? 'Paused:' : queue.node.isPlaying() ? 'Now playing:' : 'Loading audio:';
        Embed.addFields({ name: label, value: `[${currentTrack.title.slice(0, 250)}](${currentTrack.url})` });
    } else if (state.imports.size || state.pendingSearches) {
        Embed.addFields({ name: 'Loading:', value: 'Waiting for the first playable result. Playback will start as soon as it is ready.' });
    }
    Embed.addFields({ name: 'Upcoming:', value: generateSongList(upcomingTracks) });

    // Send the message
    await botReply({embeds: [Embed]}, messageChannel, interaction);
}

module.exports = {
    queue
}
