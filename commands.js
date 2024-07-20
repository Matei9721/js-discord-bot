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
    client.botMap.get(message.guild.id).musicBot.play(message.channel, message.member.voice.channel, input).catch(err =>
      logger.error(err)
    )
  } catch (err) {
    logger.error(err)
    throw err

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
    logger.info("Seeking into the song")
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

function help(client, message) {
  message.channel.send("Here is a list with all of the commands available for slash or ! commands:\n" +
  "\tplay <song/playlist> - Plays a song or playlist. If there are songs in the queue, the song will be added at the end of the queue \n" +
  "\tpause - Pauses the current song \n" +
  "\tresume - Resumes a paused song \n" +
  "\tskip - Skips the current song. If a song is looping, the loop will also stop \n" +
  "\tseek <seconds> - Skips to the timestamp within the song \n" +
  "\tqueue - Displays a list with the queued songs \n" +
  "\tdequeue <number> - Removes given song from the queue \n" +
  "\tclearQueue - removes all songs from the queue \n" +
  "\tloop - Current song will be looped \n" +
  "\tstopLoop - Stops looping current song after it ends \n" +
  "\tleave - Disconnects the bot from the channel. Note: it will also delete the queue \n" +
  "\tclean <number> - Deletes the given number of messages from the text channel \n"
  )
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
  help: help,
};
