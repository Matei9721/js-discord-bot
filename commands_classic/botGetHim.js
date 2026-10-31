const {botReply} = require("../bot-reply");
module.exports = {
    data: {
        name: "bot get him",
    },

    async execute(client, message) {
        const text = "you fell off + ratio + who asked + no u + deez nuts + radio + don't care + didn't ask +" +
            " caught in 4k + cope + seethe + GG + your mom's + the hood watches markiplier now + grow up + L +" +
            " L (part 2) + retweet + ligma + taco bell tortilla crunch + think outside the bun + ur benched + " +
            "ur a wrench + i own you + ur dad fell off + my dad could beat ur dad up + silver elite + tryhard +" +
            " boomer + ur beta + L (part 3) + ur sus + quote tweet + you're cringe + i did your mom +" +
            " you bought monkey nft + you're weirdchamp + you're a clown + my dad owns steam"
        await botReply(text, message.channel)
    },

};