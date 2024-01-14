const musicBot = require('./MusicBot');

module.exports = class botModel {
    constructor() {
        this.musicBot = new musicBot;
    }

    leaveMusic() {
        if(this.musicBot.connection) {
            this.musicBot.connection.destroy()
            this.musicBot.player.stop()
            this.musicBot.clearQueue()
        }
        this.musicBot = new musicBot
    }
}
