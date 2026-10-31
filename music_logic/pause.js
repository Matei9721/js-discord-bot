const { useTimeline } = require('discord-player');
const { botReply } = require('../bot-reply');
async function pause(messageChannel, interaction) {
    const timeline = useTimeline();
    if (!timeline?.track) return botReply('There is no track playing.', messageChannel, interaction);
    if (timeline.paused) return botReply('The player is already paused.', messageChannel, interaction);
    timeline.pause();
    await botReply('The player is now paused.', messageChannel, interaction);
}
module.exports = { pause };
