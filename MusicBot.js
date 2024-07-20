const { joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    AudioPlayerStatus,
    NoSubscriberBehavior,
    VoiceConnectionStatus, } = require('@discordjs/voice');
const play = require('./play-dl/index.js')
const ytstream  = require('yt-stream');
const {EmbedBuilder, PermissionsBitField} = require("discord.js");
const musicQueue = require('./musicQueue');
const logger = require('./logging');

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
        this.player.on(AudioPlayerStatus.Idle, async interaction => {
            if(!this.queue.isEmpty()) this.playSong()
            if(this.loop && this.currentResource) {
                const resource = await this.reloadSong(0)
                this.queue.addFirst(resource)
            }
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
                const resource = await this.loadSong(song)
                //Push the song in the queue
                this.queue.enqueue(resource)
                //If the bot is currently idle, play a song while loading the rest of the playlist
                if (first_song && this.player.state.status === "idle") {
                    try {
                        this.playSong()
                    } catch (err) {
                        this.errorMessage()
                    }
                    first_song = false
                }
            }
            logger.debug("Finished loading all songs from received playlist")
        } else{
            //Get the song and add it to the queue
            let song = (await play.search(rest, {limit : 1}))[0]
            if (!song) throw "The song does not exist!"
            const resource = await this.loadSong(song)
            this.queue.enqueue(resource)
        }
    }

    /**
     * Loads the resource
     * @param {Object} song Song which will be loaded
     * @returns Loaded resource
     */
    async loadSong(song) {
        const stream = await ytstream.stream(song.url, {
            quality: 'high',
            type: 'audio',
            highWaterMark: 1048576 * 32,
            download: true
        });
        //const stream = await play.stream(song.url)
        const resource = createAudioResource(stream.stream, {
            inputType : stream.type,
            metadata : {
                url : song.url,
                title : song.title,
                duration : song.durationRaw,
                thumbnail : song.thumbnails[0].url
            }
        })
        return resource
    }

    /**
     * Reloads the resource at given seek time
     * @param {number} seekTime 
     * @returns Loaded resource
     */
    async reloadSong(seekTime) {
        const stream = await play.stream(this.currentResource.metadata.url, { seek : parseInt(seekTime) })
        const shortResource = createAudioResource(stream.stream, {
            inputType : stream.type,
            metadata : {
                url : this.currentResource.metadata.url,
                title : this.currentResource.metadata.title,
                duration : this.currentResource.metadata.duration,
                thumbnail : this.currentResource.metadata.thumbnail
            }
        })
        return shortResource
    }

    /**
     * Plays the next song in the queue
     */
    playSong() {
        this.currentResource = this.queue.pop()
        //See if the there are any other songs queued
        let description;
        if (!this.queue.isEmpty()) description = 'Next song in queue is ' + this.queue.peek().metadata.title
        else description = 'Queue is empty'
        
        //Send the play message and play the song
        const Embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(this.currentResource.metadata.title)
            .setURL(this.currentResource.metadata.url)
            .setAuthor({name: 'Now playing', url: this.currentResource.metadata.url})
            .setDescription(description)
            .setThumbnail(this.currentResource.metadata.thumbnail)
            .addFields({name: 'Song duration', value: this.currentResource.metadata.duration})
            .setTimestamp()

        this.messageChannel.send({ embeds: [Embed] });
        this.player.play(this.currentResource)
    }

    /**
     * Adds the song to queue if there is another song playing
     * @param {String} rest Song URL/title to be added to the queue
     * @returns Stops early only if there is no song currently playing
     */
    async addToQueue(rest, isSpotifyList=false) {
        await this.addResource(rest)
        
        //Base case: If the player is idle add the song to the queue and play it
        if(this.player.state.status === "idle") return
        if(isSpotifyList) return

        //Different messages for adding a playlist or a song
        if(rest.includes("playlist")) {
            const Embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setAuthor({name: 'Queued all songs from the playlist', url:rest})
            .setDescription('Current size of the queue: ' + String(this.queue.getSize()))
            .setTimestamp()
            this.messageChannel.send({ embeds: [Embed] });
        }
        else {
            //Confirm with a message that the song was added to the queue
            const song = this.queue.getLast()
            const Embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(song.metadata.title)
            .setURL(song.metadata.url)
            .setAuthor({name: 'Queued song', url:song.metadata.url})
            .setDescription('Remaining songs in queue until play: ' + String(this.queue.getSize()))
            .setThumbnail(song.metadata.thumbnail)
            .addFields(
                { name: 'Song duration', value: song.metadata.duration },
            )
            .setTimestamp()
            this.messageChannel.send({ embeds: [Embed] });
        }
    }

    /**
     * Displays the error message for invalid resource/input
     */
    errorMessage() {
        const Error = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle("Error while loading song or playlist")
            .setDescription('Check the link or name of the song, it might not exist!')
            .setTimestamp()
        this.messageChannel.send({ embeds: [Error] });
    }

    /**
     * Connects bot to given voice channel
     * @param {*} voiceChannel Voice channel which the bot connects to
     */
    async createConnection(voiceChannel) {
        if (!voiceChannel) {
            this.messageChannel.send("I am an idiot bot and I don't know what to do if you are not in a voice room")
            throw "User not detected in a voice channel!"
        }

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

        //Connect the bot to the voice channel if it is not there yet
        if(!this.connection) await this.createConnection(voiceChannel)
        
        const spotifyReg = /^(https?:\/\/open.spotify.com\/(track|user|artist|album|playlist)\/[a-zA-Z0-9]+(\/playlist\/[a-zA-Z0-9]+(?:\?si=[a-zA-Z0-9]+)?|)|spotify:(track|user|artist|album|playlist):[a-zA-Z0-9]+(?::playlist:[a-zA-Z0-9]+|))/
        const youtubeReg = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/
        
        //Check if the string received is a Spotify url
        if(spotifyReg.test(input)) {
            this.playSpotify(input)
        }
        //Check if the string received is a YouTube url
        else if(youtubeReg.test(input)) {
            input = input.split("&")[0]
            this.playYoutube(input)
        }
        //Try to find a song with matching name
        else {
            this.playYoutube(input)
        }
    }
    
    /**
     * Play command logic which will end up playing/adding to the queue a song/playlist
     * @param {*} input Song URL/title which needs to be played
     */
    async playYoutube(input, isSpotifyList=false) {
        //Try to add the song
        try{
            logger.debug(input)
            await this.addToQueue(input, isSpotifyList)
            //If the bot is currently idle, play the song
            if (this.player.state.status === "idle") {
                try {
                    this.playSong()
                } catch (err) {
                    throw new Error(err)
                }
            }
        } catch (err) {
            if(isSpotifyList) {
                logger.error("A song from a Spotify playlist/album failed to load or was not found.")
                return
            }
            this.errorMessage()
            logger.error(err)
            throw err
        }    
    }

    /**
     * Adds the song/album/playlist to the queue
     * @param {*} input Spotify URL which needs to be played
     */
    async playSpotify(input) {
        //Check if Spotify token needs refresh
        try{
            if (play.is_expired()) {
                await play.refreshToken()
            }
        } catch(error) {
            logger.error("Spotify credentials might have not been set up!")
            this.messageChannel.send("This bot does not have Spotify set up.")
            return
        }

        //Fetch data from Spotify
        let sp_data = await play.spotify(input)
        
        // Check the type of Spotify resource and handle accordingly
        if (sp_data.type === 'track') {
            // It's a song
            this.addSpotifyTrack(sp_data, false)
        } else if (sp_data.type === 'album' || sp_data.type === 'playlist') {
            // It's an album or playlist
            const tracklist = sp_data.fetched_tracks.get("1")
            this.messageChannel.send(`Adding ${tracklist.length} songs from Spotify to the queue.`)
            for(const track of tracklist) {
                this.addSpotifyTrack(track, true)
            }
        } else {
            // Unsupported Spotify resource type
            this.messageChannel.send('Unsupported Spotify resource type. Only public songs, playlists and albums are available.')
        }
    }

    /**
     * Calls YouTube play function to play a song found on Spotify
     * @param {*} track Spotify Track which needs to be played
     */
    addSpotifyTrack(track, isSpotifyList){
        const artist = track.artists[0].name
        const songName = track.name
        const searchName = artist + " " + songName
        this.playYoutube(searchName, isSpotifyList)
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
        if(this.loop) this.stopLoop()
        if(this.queue.isEmpty()) this.player.stop()
        else this.playSong()
    }

    /**
     * Plays from given second into the song
     * @param {number} seekTime The second which the player will skip to
     */
    async seek(seekTime) {
        // Get the current resource being played by the AudioPlayer
        try {
            const shortResource = await this.reloadSong(seekTime)
            this.player.stop()
            this.player.play(shortResource)
        } catch (err) {logger.error(err)}
    }

    /**
     * Displays the current queue of songs
     */
    getQueue() {
        let fields = this.queue.getQueue()
        const Embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setAuthor({name : 'Songs in queue:'})
            .setDescription('There are ' + this.queue.getSize() + ' more songs in the queue')
            .addFields(fields.slice(0,24))
            .setTimestamp()
        this.messageChannel.send({ embeds: [Embed] });
    }

    clearQueue() {
        this.queue = new musicQueue
    }

    removeSongAt(position) {
        const index = position - 1
        if(index < 0 || position > this.queue.getSize()) {
            const Error = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle("Invalid Input")
                .setDescription('Your input was larger/smaller than the size of the queue!')
                .setTimestamp()
            this.messageChannel.send({ embeds: [Error] });
        }
        else this.queue.removeAt(index)
    }

    async startLoop() {
        this.loop = true
        if(this.currentResource) {
            const resource = await this.reloadSong(0)
            this.queue.addFirst(resource)
        }
    }
    
    stopLoop() {
        this.loop = false
        if(this.currentResource.metadata.url == this.queue.peek().metadata.url) this.queue.pop()
    }
}
