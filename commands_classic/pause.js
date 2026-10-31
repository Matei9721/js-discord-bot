const {pause} = require("../music_logic/pause");

module.exports = {
    data: {
        name: "pause",
    },

    async execute(client, message) {
        await pause(message.channel)
    },
};