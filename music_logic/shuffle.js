const {useQueue} = require("discord-player");
const {botReply} = require("../bot-reply");
const {EmbedBuilder} = require("discord.js");
const {generateSongList} = require("../utilities/songListOperations");

async function shuffle(messageChannel, interaction) {
// Get the current queue
    const queue = useQueue();

    if (!queue) {
        await botReply('This server does not have an active player session.', messageChannel, interaction);
        return;
    }

    // Check if there are enough tracks in the queue
    if (queue.tracks.size < 2) {
        await botReply('There are not enough tracks in the queue to shuffle.', messageChannel, interaction);
        return;
    }

    // Shuffle the tracks in the queue
    queue.tracks.shuffle();
    require('../youtube/prefetch').prefetchNext(queue);

    // Format the shuffled tracks within character limits
    const shuffledTracks = queue.tracks.toArray();


    const Embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🔀 Playlist Shuffled!')
        .setDescription(`Shuffled ${queue.tracks.size} tracks.`)
        .addFields({name: 'New Order:', value: generateSongList(shuffledTracks)})
        .setTimestamp();

    // Send embed confirmation
    await botReply({embeds: [Embed]}, messageChannel, interaction);


}

module.exports = {
    shuffle
}
