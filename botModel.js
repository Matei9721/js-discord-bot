const musicBot = require('./MusicBot');
const triviaBot = require("./triviaBot");

module.exports = class botModel {
    constructor() {
        this.musicBot = new musicBot;
        this.triviaBot = null;
    }

    leaveMusic() {
        if(this.musicBot.connection) this.musicBot.connection.destroy()
        this.musicBot = new musicBot
    }
}
