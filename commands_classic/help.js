const { help } = require('../commands/help');
const { botReply } = require('../bot-reply');
module.exports = { data: { name: 'help' }, execute: (client, message) => botReply(help, message.channel) };
