const { useQueue } = require('discord-player');
const { botReply } = require('../bot-reply');
async function clearQueue(messageChannel, interaction) {
    const queue = useQueue();
    if (!queue) return botReply('This server does not have an active player session.', messageChannel, interaction);
    require('./enqueue').cancelImports(queue);
    queue.tracks.clear();
    require('../youtube/prefetch').forget(queue);
    await botReply('Queue cleared. The current song will continue playing.', messageChannel, interaction);
}
module.exports = { clearQueue };
