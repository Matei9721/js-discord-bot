const {queue} = require("../music_logic/queue");

module.exports = {
    data: {
        name: "queue",
    },

    async execute(client, message) {
        await queue(message.channel)
    },
};