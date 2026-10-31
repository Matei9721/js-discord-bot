const {resume} = require("../music_logic/resume");

module.exports = {
    data: {
        name: "resume",
    },

    async execute(client, message) {
        await resume(message.channel)
    },
};