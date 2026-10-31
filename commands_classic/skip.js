const {skip} = require("../music_logic/skip");

module.exports = {
    data: {
        name: "skip",
    },

    async execute(client, message) {
        await skip(message.channel)
    },
};