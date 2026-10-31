const {useQueue} = require("discord-player");
const {botReply} = require("../bot-reply");
const {stateFor} = require('./enqueue');

async function skip(messageChannel, interaction) {
    // Get the current queue
    const queue = useQueue();

    if (!queue) {
        await botReply('This server does not have an active player session.', messageChannel, interaction)
        return;
    }

    const state = stateFor(queue);
    const resource = queue.dispatcher?.audioResource;
    if (state.starting || !resource || state.skippedResource === resource || (!queue.node.isPlaying() && !queue.node.isPaused())) {
        await botReply(queue.currentTrack || state.starting ? 'The next song is still loading. Please wait for it to start.' : 'There is no track playing.', messageChannel, interaction);
        return;
    }

    // Skip the current track
    state.skippedResource = resource;
    queue.node.skip();

    // Send a confirmation message
    await botReply('Skipped the current song.', messageChannel, interaction);
}

module.exports = {
    skip
}
