const {joinVoiceChannel, entersState, VoiceConnectionStatus, createAudioPlayer, NoSubscriberBehavior, AudioPlayerStatus,
    createAudioResource
} = require("@discordjs/voice");
const {MessageEmbed} = require("discord.js");
const play = require("play-dl");

class botInstanceSlash {

    constructor() {
        this.queue = [];
        this.connection = null;
        this.channel = null;
        this.player = null;
        this.setPlayer();

    }

    setPlayer() {
        this.player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play
            }
        })

        this.player.on(AudioPlayerStatus.Idle, interaction => {
            if(this.queue.length > 0) {
                this.playSong()
            }
        });
    }

    async addResource(rest) {
        let url;
        let yt_info
        let first_song = true;

        if(rest.includes("playlist")) {
            let songs_info = await play.playlist_info(rest, {incomplete : true})
            for(let i=0; i<songs_info.videos.length;i++) {
                let stream = await play.stream(songs_info.videos[i].url)
                let resource = createAudioResource(stream.stream, {
                    inputType : stream.type,
                    metadata : {
                        url : songs_info.videos[i].url,
                        title : songs_info.videos[i].title,
                        duration : songs_info.videos[i].durationRaw,
                        thumbnail : songs_info.videos[i].thumbnails[0].url
                    }
                })

                this.queue.push(resource)

                if(first_song) {
                    if (this.player.state.status === "idle") this.playSong()
                    first_song = false
                }
            }
        } else {

            if(rest.includes("https")) {
                rest = rest.split("&")[0];
                yt_info = await play.search(rest, {limit: 1})
                console.log(yt_info)
                url = rest;
            } else {
                yt_info = await play.search(rest, {limit: 1})
                url = yt_info[0].url
            }

            let stream = await play.stream(url)
            let resource = createAudioResource(stream.stream, {
                inputType: stream.type,
                metadata: {
                    url: url,
                    title: yt_info[0].title,
                    duration: yt_info[0].durationRaw,
                    thumbnail: yt_info[0].thumbnails[0].url
                }
            })
            this.queue.push(resource)
        }

    }

    getQueue() {
        let fields = []

        this.queue.forEach(element => {
            let field = { name: element.metadata.title, value: element.metadata.url }
            fields.push(field)
        })

        const Embed = new MessageEmbed()
            .setColor('#0099ff')
            .setAuthor('Songs in queue:', 'https://images.emojiterra.com/twitter/v13.1/512px/1f972.png')
            .setDescription('There are ' + this.queue.length + ' more songs in the queue')
            .addFields(fields)
            .setTimestamp()
        this.channel.send({ embeds: [Embed] });
    }

    getNextResource() {
        return this.queue.shift()
    }

    playSong() {
        const resource = this.getNextResource()
        let description;
        if (this.queue.length > 0) {
            description = 'Next song in queue is ' + this.queue[0].metadata.title
        } else if (this.queue.length === 0) {
            description = 'Queue is empty'
        }
        const Embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(resource.metadata.title)
            .setURL(resource.metadata.url)
            .setAuthor('Now playing', 'https://images.emojiterra.com/twitter/v13.1/512px/1f972.png',
                resource.metadata.url)
            .setDescription(description)
            .setThumbnail(resource.metadata.thumbnail)
            .addFields({ name: 'Song duration', value: resource.metadata.duration })
            .setTimestamp()
        this.channel.send({ embeds: [Embed] });
        this.player.play(resource)
    }

    async addToQueue(rest) {
        if(this.player.state.status === "idle") {
            await this.addResource(rest)
            return
        }

        await this.addResource(rest)

        const resource = this.queue[this.queue.length-1]

        const Embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(resource.metadata.title)
            .setURL(resource.metadata.url)
            .setAuthor('Queued song', 'https://images.emojiterra.com/twitter/v13.1/512px/1f972.png',
                resource.metadata.url)
            .setDescription('Remaining songs in queue until play: ' + String(this.queue.length - 1))
            .setThumbnail(resource.metadata.thumbnail)
            .addFields(
                { name: 'Song duration', value: resource.metadata.duration },
            )

            .setTimestamp()

        this.channel.send({ embeds: [Embed] });

    }


    async executeSong(interaction) {
        this.channel = interaction.channel;
        const song = interaction.options.getString("song");
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            interaction.reply("I am an idiot bot and I don't know what to do if you are not in a voice room");
            return
        }

        const permissions = voiceChannel.permissionsFor(interaction.member.user);

        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            interaction.reply("I need the permissions to join and speak in your voice channel!");
            return
        }

        if (!this.connection) {
            this.connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guildId,
                adapterCreator: interaction.guild.voiceAdapterCreator
            })

            await entersState(this.connection, VoiceConnectionStatus.Ready, 30e3);
            this.connection.subscribe(this.player);
            try {
                await this.addResource(song)
            } catch (err) {
                console.log(err)
            }

            if (this.player.state.status === "idle") {
                console.log("im idle")
                try {
                    this.playSong()
                } catch (err) {
                    this.errorMessageSlash(interaction)
                    console.log(err)
                }
            }

        } else {
            try {
                await this.addToQueue(song)
                if (this.player.state.status === "idle") {
                    this.playSong()
                }
            } catch (err) {
                this.errorMessageSlash(interaction)
                console.log(err)
            }
        }
    }

    errorMessageSlash(interaction) {
        const Error = new MessageEmbed()
            .setColor('#ff0000')
            .setTitle("Error while loading resource or playlist")
            .setDescription('Check the link of the resource or unavailable videos')
            .setTimestamp()
        interaction.reply({embeds: [Error]});
    }
}

module.exports = {
    botInstanceSlash: botInstanceSlash
}