const {shuffle} = require("../music_logic/shuffle");

module.exports = {
    data: {
        name: "shuffle",
    },

    async execute(client, message) {
        await shuffle(message.channel)
    },
};