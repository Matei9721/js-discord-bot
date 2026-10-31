const {botReply} = require("../bot-reply");
const {seek} = require("../music_logic/seek");

module.exports = {
    data: {
        name: "seek",
    },

    async execute(client, message) {
        //Get input and check if it is a number and parse it
        let [first, ...rest] = message.content.split(' ')
        rest = rest.join(' ')
        if (isNaN(rest)) {
            await botReply("Your input is not a number!", message.channel)
            return
        }
        const seconds = /^\d+$/.test(rest.trim()) ? Number(rest) : NaN
        await seek(seconds, message.channel)
    },
};
