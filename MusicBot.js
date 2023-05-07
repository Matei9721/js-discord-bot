const { joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    AudioPlayerStatus,
    NoSubscriberBehavior,
    VoiceConnectionStatus, } = require('@discordjs/voice');
const play = require('play-dl')
const {EmbedBuilder, PermissionsBitField} = require("discord.js");
const musicQueue = require('./musicQueue');

module.exports = class musicBot {
    constructor() {
        this.queue = new musicQueue;
        this.connection = null;
        this.messageChannel = null;
        this.loop = false
        this.currentResource = null;
        this.player = null;
        this.setPLayer();
    }

    /**
     * Creates the player and sets up listener to play the next song when idle
     */
    setPLayer() {
        this.player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play
            }
        })
        this.player.on(AudioPlayerStatus.Idle, interaction => {
            if(!this.queue.isEmpty()) this.playSong()
        });
    }

    /**
     * Adds the song/playlist to the queue
     * @param {String} rest URL/Song name to be added to the queue
     */
    async addResource(rest) {
        //Handle playlists
        if(rest.includes("playlist")) {
            let first_song = true
            let songs_info = await play.playlist_info(rest, {incomplete : true})
            let videos = await songs_info.all_videos()
            for (const song of videos) {
                //Get the song resource
                let stream = await play.stream(song.url)
                let resource = createAudioResource(stream.stream, {
                    inputType : stream.type,
                    metadata : {
                        url : song.url,
                        title : song.title,
                        duration : song.durationRaw,
                        thumbnail : song.thumbnails[0].url
                    }
                })
                //Push the song in the queue
                this.queue.enqueue(resource)

                //If the bot is currently idle, play a song while loading the rest of the playlist
                if (first_song && this.player.state.status === "idle") {
                    try {
                        this.playSong()
                    } catch (err) {
                        this.errorMessage(this.messageChannel)
                    }
                    first_song = false
                }
            }
            console.log("Finished loading all songs from received playlist")
        } else{
            //Get the song and add it to the queue
            let song = (await play.search(rest, {limit : 1}))[0]
            let stream = await play.stream(song.url)
            let resource = createAudioResource(stream.stream, {
                inputType : stream.type,
                metadata : {
                    url : song.url,
                    title : song.title,
                    duration : song.durationRaw,
                    thumbnail : song.thumbnails[0].url
                }
            })
            this.queue.enqueue(resource)
        }
    }

    /**
     * Gets the next song from the queue and returns it
     * @returns {*} Current song which should be playing
     */
    getNextResource() {
        let currentResource = this.queue.pop()
        this.currentResource = currentResource.metadata.url
        return currentResource
    }

    /**
     * Plays the next song in the queue
     */
    playSong() {
        const resource = this.getNextResource()
        console.log("Here in playsong")
        console.log(resource.metadata)
        //See if the there are any other songs queued
        let description;
        if (!this.queue.isEmpty()) description = 'Next song in queue is ' + this.queue.peek().metadata.title
        else description = 'Queue is empty'
        console.log(resource.metadata.url)
        
        //Send the play message and play the song
        const Embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(resource.metadata.title)
            .setURL(resource.metadata.url)
            .setAuthor({name: 'Now playing', inconURL: 'https://images.emojiterra.com/twitter/v13.1/512px/1f972.png',
                url: resource.metadata.url})
            .setDescription(description)
            .setThumbnail(resource.metadata.thumbnail)
            .addFields({name: 'Song duration', value: resource.metadata.duration})
            .setTimestamp()

        this.messageChannel.send({ embeds: [Embed] });
        this.player.play(resource)
    }

    /**
     * Adds the song to queue if there is another song playing
     * @param {String} rest Song URL/title to be added to the queue
     * @returns Stops early only if there is no song currently playing
     */
    async addToQueue(rest) {
        await this.addResource(rest)
        
        //Base case: If the player is idle add the song to the queue and play it
        if(this.player.state.status === "idle") return

        //Confirm with a message that the song was added to the queue
        const song = this.queue.getLast()
        const Embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(song.metadata.title)
            .setURL(song.metadata.url)
            .setAuthor({name: 'Queued song', iconURL: 'https://images.emojiterra.com/twitter/v13.1/512px/1f972.png',
                url:song.metadata.url})
            .setDescription('Remaining songs in queue until play: ' + String(this.queue.getSize()))
            .setThumbnail(song.metadata.thumbnail)
            .addFields(
                { name: 'Song duration', value: song.metadata.duration },
            )
            .setTimestamp()
        this.messageChannel.send({ embeds: [Embed] });
    }

    /**
     * Displays the error message for invalid resource/input
     * @param {*} channel Channel in which to display the message
     */
    errorMessage(channel) {
        const Error = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle("Error while loading resource or playlist")
            .setDescription('Check the link of the resource or unavailable videos')
            .setTimestamp()
        channel.send({ embeds: [Error] });
    }

    /**
     * Connects bot to given voice channel
     * @param {*} voiceChannel Voice channel which the bot connects to
     */
    async createConnection(voiceChannel) {
        if (!voiceChannel) this.messageChannel.send("I am an idiot bot and I don't know what to do if you are not in a voice room")

        //Check if the bot has the minimum permissions
        const permissions = voiceChannel.permissionsFor(this.messageChannel.client.user);
        if (!permissions.has(PermissionsBitField.Flags.Connect) || !permissions.has(PermissionsBitField.Flags.Speak))
            this.messageChannel.send("I need the permissions to join and speak in your voice channel!")

        if(!this.connection) {
            //Initialize first connection of bot to voice channel
            this.connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: this.messageChannel.guild.id,
                adapterCreator: this.messageChannel.guild.voiceAdapterCreator
            })
            this.connection.on('stateChange', (old_state, new_state) => {
                if (old_state.status === VoiceConnectionStatus.Ready &&
                    new_state.status === VoiceConnectionStatus.Connecting) {
                    this.connection.configureNetworking();
                }
            })
            await entersState(this.connection, VoiceConnectionStatus.Ready, 30e3);
            this.connection.subscribe(this.player);
        }
    }

    /**
     * Play command logic which will end up playing/adding to the queue a song/playlist
     * @param {*} messageChannel Message channel which the command was sent from
     * @param {*} voiceChannel Voice channel which the bot will connect to
     * @param {*} input Song URL/title which needs to be played
     */
    async play(messageChannel, voiceChannel, input) {
        //Ensure that we send messages to the text channel where the bot was last used for music
        this.messageChannel = messageChannel
        
        //Check if the string received is a youtube regex or not
        let youtube_regex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/
        if(youtube_regex.test(input)) input = input.split("&")[0]
                
        //Connect the bot to the voice channel if it is not there yet
        if(!this.connection) this.createConnection(voiceChannel)
        
        //Try to add the song
        try{
            console.log(input)
            await this.addToQueue(input)
        } catch (err) {
            console.log(err)
        }
        //If the bot is currently idle, play the song
        if (this.player.state.status === "idle") {
            try {
                this.playSong()
            } catch (err) {
                this.errorMessage(this.messageChannel)
                throw new Error(err)
            }
        }
    }

    /**
     * Pauses the player
     */
    pause() {
        this.player.pause()
    }

    /**
     * Resumes the player
     */
    resume() {
        this.player.unpause()
    }

    /**
     * Skips the current song
     */
    skip() {
        if(this.queue.isEmpty()) this.player.stop()
        else this.playSong()
    }

    /**
     * Plays from given second into the song
     * @param {Num} seekTime The second which the player will skip to
     */
    async seek(seekTime) {
        // Get the current resource being played by the AudioPlayer
        try {
            let stream = await play.stream(this.currentResource, { seek : parseInt(seekTime) })
            let shortResource = createAudioResource(stream.stream, {
                inputType : stream.type,
                metadata : {
                    url : this.currentResource,
                }
            })
            this.player.stop()
            this.player.play(shortResource)
        } catch (err) {console.log(err)}
    }

    /**
     * Displays the current queue of songs
     */
    getQueue() {
        let fields = this.queue.getQueue()
        const Embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setAuthor({name : 'Songs in queue:', iconURL: 'https://images.emojiterra.com/twitter/v13.1/512px/1f972.png'})
            .setDescription('There are ' + this.queue.getSize() + ' more songs in the queue')
            .addFields(fields)
            .setTimestamp()
        this.messageChannel.send({ embeds: [Embed] });
    }

}
