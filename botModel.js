const musicBot = require('./MusicBot');

module.exports = class botModel {
    constructor() {
        this.musicBot = new musicBot;
        this.generalBot = null;
        this.animeBot = null;
    }

    leaveMusic() {
        if(this.musicBot.connection) this.musicBot.connection.destroy()
        this.musicBot = new musicBot
    }
}
