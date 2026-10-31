const { MessageFlags } = require('discord.js');
function payload(message) {
    return { ...(typeof message === 'string' ? { content: message } : message), allowedMentions: { parse: [] } };
}
async function botReply(message, messageChannel, interaction) {
    const body = payload(message);
    if (!interaction) return messageChannel.send(body);
    if (interaction.deferred && !interaction.replied) return interaction.editReply(body);
    if (interaction.replied) return interaction.followUp(body);
    return interaction.reply(body);
}
async function botMessage(message, messageChannel) {
    return messageChannel.send(payload(message));
}
async function privateReply(message, interaction) {
    return interaction.reply({ ...payload(message), flags: MessageFlags.Ephemeral });
}
module.exports = { botReply, botMessage, privateReply };
