const {clearQueue} = require("../music_logic/clearqueue");

module.exports = {
    data: {
        name: "clearqueue",
    },

    async execute(client, message) {
        await clearQueue(message.channel)
    },
};