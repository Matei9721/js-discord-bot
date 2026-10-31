const {leave} = require("../music_logic/leave");

module.exports = {
    data: {
        name: "leave",
    },

    async execute(client, message) {
        await leave(message.channel)
    },
};