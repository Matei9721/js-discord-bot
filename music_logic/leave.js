const { useQueue } = require('discord-player');
const { botReply } = require('../bot-reply');
async function leave(messageChannel, interaction) {
    const queue = useQueue();
    if (!queue) return botReply('This server does not have an active player session.', messageChannel, interaction);
    require('./enqueue').cancelImports(queue);
    require('../youtube/prefetch').forget(queue);
    queue.delete();
    await botReply('Disconnected and cleared the queue.', messageChannel, interaction);
}
module.exports = { leave };
