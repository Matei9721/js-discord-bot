const botModel = require("./botModel");
const logger = require('./logging');

//MusicBot Commands

function play(client, message) {
  //If we receive !play make sure we have a bot initialized
  if(!client.botMap.has(message.guild.id)) {
    client.botMap.set(message.guild.id, new botModel())
    logger.info("Created new instance for Guild " + message.guild.name)
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

function loop(client, message) {
  if(client.botMap.has(message.guild.id)) {
    client.botMap.get(message.guild.id).musicBot.startLoop()
  }
}

function stopLoop(client, message) {
  if(client.botMap.has(message.guild.id)) {
    client.botMap.get(message.guild.id).musicBot.stopLoop()
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

function dequeue(client, message) {
  //Get input and check if it is a number and parse it
  let [first, ...rest] = message.content.split(' ')
  rest = rest.join(' ')
  if(isNaN(rest)) {
    message.channel.send("Your input is not a number!")
    return
  }
  const position = parseInt(rest,10)

  if(client.botMap.has(message.guild.id)) {
    client.botMap.get(message.guild.id).musicBot.removeSongAt(position, message.channel)
  }
}

function clearQueue(client, message) {
  if(client.botMap.has(message.guild.id)) {
    client.botMap.get(message.guild.id).musicBot.clearQueue()
  }
}

function leave(client, message) {
  if(client.botMap.has(message.guild.id)) {
    client.botMap.get(message.guild.id).leaveMusic()
  }
}

//Other commands

function clean(client, message) {
  //Get input and check if it is a number and parse it
  let [first, ...rest] = message.content.split(' ')
  rest = rest.join(' ')
  if(isNaN(rest)) {
    message.channel.send("Your input is not a number!")
    return
  }
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
  clearQueue: clearQueue,
  dequeue: dequeue,
  loop: loop,
  stopLoop: stopLoop,
};
