const {play} = require("../music_logic/play");

module.exports = {
    data: {
        name: "play",
    },

    async execute(client, message) {
        let input = message.content.split(' ');
        input.shift();
        input = input.join(' ')
        await play(input, message.member.voice.channel, message.channel, undefined, message.author)
    },
};
