const { useTimeline } = require('discord-player');
const { botReply } = require('../bot-reply');
async function resume(messageChannel, interaction) {
    const timeline = useTimeline();
    if (!timeline?.track) return botReply('There is no track playing.', messageChannel, interaction);
    if (!timeline.paused) return botReply('The player is already playing.', messageChannel, interaction);
    timeline.resume();
    await botReply('The player is now resumed.', messageChannel, interaction);
}
module.exports = { resume };
