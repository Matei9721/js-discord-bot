const { joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    AudioPlayerStatus,
    NoSubscriberBehavior,
    VoiceConnectionStatus, } = require('@discordjs/voice');
const play = require('play-dl')
const {EmbedBuilder} = require("discord.js");
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

    async addResource(rest) {
        //Handle playlists
        if(rest.includes("playlist")) {
            let first_song = true
            let songs_info = await play.playlist_info(rest, {incomplete : true})
            for(let song in songs_info) {
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

    getNextResource() {
        let currentResource = this.queue.pop()
        this.currentResource = currentResource.metadata.url
        return currentResource
    }

    playSong() {
        const resource = this.getNextResource()

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

    errorMessage(channel) {
        const Error = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle("Error while loading resource or playlist")
            .setDescription('Check the link of the resource or unavailable videos')
            .setTimestamp()
        channel.send({ embeds: [Error] });
    }

    async createConnection(voiceChannel) {
        if (!voiceChannel) this.messageChannel.send("I am an idiot bot and I don't know what to do if you are not in a voice room")

        //Check if the bot has the minimum permissions
        const permissions = voiceChannel.permissionsFor(this.messageChannel.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) 
            this.messageChannel.send("I need the permissions to join and speak in your voice channel!")

        if(!this.connection) {
            //Initialize first connection of bot to voice channel
            this.connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: this.messageChannel.guild.id,
                adapterCreator: this.messageChannel.guild.voiceAdapterCreator
            })
            this.connection.on('stateChange', (old_state, new_state) => {
                if (old_state.status === VoiceConnectionStatus.Ready && new_state.status === VoiceConnectionStatus.Connecting) {
                    this.connection.configureNetworking();
                }
            })
            await entersState(this.connection, VoiceConnectionStatus.Ready, 30e3);
            this.connection.subscribe(this.player);
        }
    }

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

    pause() {
        this.player.pause()
    }

    resume() {
        this.player.unpause()
    }

    skip() {
        if(this.queue.isEmpty()) this.player.stop()
        else this.playSong()
    }

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
