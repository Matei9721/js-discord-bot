const {loop} = require("../music_logic/loop");
const {botReply} = require("../bot-reply");
const {QueueRepeatMode} = require("discord-player");

const loop_options = {
    'off': QueueRepeatMode.OFF,
    'track': QueueRepeatMode.TRACK,
    'queue': QueueRepeatMode.QUEUE,
    'autoplay': QueueRepeatMode.AUTOPLAY,
};

module.exports = {
    data: {
        name: "loop",
    },
    async execute(client, message) {
        let input = message.content.split(' ');
        input.shift();
        input = input.join(' ').toLowerCase()
        const loop_option = loop_options[input]
        if (loop_option === undefined) {
            return botReply(`Invalid loop mode. Options are: off, track, queue, autoplay`, message.channel)
        }

        await loop(loop_option, message.channel)
    },
};
