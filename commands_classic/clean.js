const {botReply} = require("../bot-reply");
module.exports = {
    data: {
        name: "clean",
    },

    async execute(client, message) {
        //Get input and check if it is a number and parse it
        let [first, ...rest] = message.content.split(' ')
        rest = rest.join(' ')
        if (isNaN(rest)) {
            await botReply("Your input is not a number!", message.channel)
            return
        }
        const amount = parseInt(rest, 10)

        if (!/^\d+$/.test(rest.trim()) || amount < 1 || amount >= 100) {
            await botReply("Choose a whole number from 1 to 99.", message.channel)
            return;
        }
        await message.channel.bulkDelete(amount + 1, true)
    },
};
