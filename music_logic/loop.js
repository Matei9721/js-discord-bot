const {useQueue, QueueRepeatMode} = require("discord-player");
const {botReply} = require("../bot-reply");

const modeNames = {
    [QueueRepeatMode.OFF]: "off",
    [QueueRepeatMode.TRACK]: "track",
    [QueueRepeatMode.QUEUE]: "queue looping",
    [QueueRepeatMode.AUTOPLAY]: "autoplay suggestions"
};

async function loop(loopMode, messageChannel, interaction) {
    if (!Object.hasOwn(modeNames, loopMode)) throw new Error('Invalid loop mode. Use off, track, queue or autoplay.');
    // Get the current queue
    const queue = useQueue();
    if (!queue) {
        await botReply(
            'This server does not have an active player session.', messageChannel, interaction
        );
        return;
    }

    // Set the loop mode
    queue.setRepeatMode(loopMode);

    // Send a confirmation message
    await botReply(`Loop mode set to ${modeNames[loopMode]}.`, messageChannel, interaction);
}

module.exports = {
    loop
}
