const musicBot = require('./MusicBot');

module.exports = class botModel {
    constructor() {
        this.musicBot = new musicBot;
    }

    leaveMusic() {
        if(this.musicBot.connection) this.musicBot.connection.destroy()
        this.musicBot = new musicBot
    }
}
