const botModel = require("./botModel");

function play(client, message) {
  //If we receive !play make sure we have a bot initialized
  if(!client.botMap.has(message.guild.id)) {
    client.botMap.set(message.guild.id, new botModel())
  }
  try{
    let input = message.content.split(' ');input.shift(); input = input.join(' ')
    client.botMap.get(message.guild.id).musicBot.play(message.channel, message.member.voice.channel, input)
  } catch (err) {
    console.log("Error")
  }
}

function pause(client, message) {
  if(client.botMap.has(message.guild.id)) {
    client.botMap.get(message.guild.id).musicBot.pause()
  }
}

function skip(client, message) {
  if(client.botMap.has(message.guild.id)) {
    client.botMap.get(message.guild.id).musicBot.skip()
  }
}

function resume(client, message) {
  if(client.botMap.has(message.guild.id)){
    client.botMap.get(message.guild.id).musicBot.resume()
  }
}

function seek(client, message) {
  if(client.botMap.has(message.guild.id)){
    console.log("seeking")
    const seekTime = message.content.split(' ')[1]
    client.botMap.get(message.guild.id).musicBot.seek(seekTime)
  }
}

function queue(client, message) {
  if(client.botMap.has(message.guild.id)){
    client.botMap.get(message.guild.id).musicBot.getQueue()
  }
}

function leave(client, message) {
  if(client.botMap.has(message.guild.id)) {
    client.botMap.get(message.guild.id).leaveMusic()
  }
}

function clean(client, message) {
  let [first, ...rest] = message.content.split(' ')
        rest = rest.join(' ')

        const amount = parseInt(rest,10)
        if(amount >= 100) {
            message.reply("Maximum input value is 99")
            return;
        }
        message.channel.bulkDelete(amount + 1)
}

function botGetHim(client, message) {
  message.channel.send("you fell off + ratio + who asked + no u + deez nuts + radio + don't care + didn't ask +" +
    " caught in 4k + cope + seethe + GG + your mom's + the hood watches markiplier now + grow up + L +" +
    " L (part 2) + retweet + ligma + taco bell tortilla crunch + think outside the bun + ur benched + " +
    "ur a wrench + i own you + ur dad fell off + my dad could beat ur dad up + silver elite + tryhard +" +
    " boomer + ur beta + L (part 3) + ur sus + quote tweet + you're cringe + i did your mom +" +
    " you bought monkey nft + you're weirdchamp + you're a clown + my dad owns steam")

}

module.exports = {
  play: play,
  pause: pause,
  skip: skip,
  resume: resume,
  seek: seek,
  queue: queue,
  leave: leave,
  clean: clean,
  botGetHim: botGetHim,
};
