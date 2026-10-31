const { botReply } = require('../bot-reply');
const { useQueue } = require('discord-player');
async function seek(seconds, messageChannel, interaction) {
    if (!Number.isSafeInteger(seconds) || seconds < 0) throw new Error('Seek needs a whole number of seconds, zero or greater.');
    const queue = useQueue();
    if (!queue?.currentTrack) return botReply('There is no track playing.', messageChannel, interaction);
    if (queue.currentTrack.live || !queue.currentTrack.durationMS || seconds * 1000 >= queue.currentTrack.durationMS) throw new Error('Choose a position before the end of a non-live song.');
    if (!await queue.node.seek(seconds * 1000)) throw new Error('Unable to seek in this song.');
    await botReply(`Skipped to ${seconds} seconds in the current song.`, messageChannel, interaction);
}
module.exports = { seek };
