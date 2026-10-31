require('dotenv').config({ quiet: true });
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { startPlayer } = require('./setupPlayer');
const { loadCommands, registerCommands } = require('./commandRegister');
const { createHandlers } = require('./handlers');
const logger = require('./logging');
function validateConfig(env = process.env) {
    for (const key of ['BOT_TOKEN', 'CLIENT_ID']) if (!env[key]?.trim()) throw new Error(`Missing ${key} in .env`);
    for (const key of ['CLIENT_ID', 'GUILD_ID']) if (env[key] && !/^\d{17,20}$/.test(env[key])) throw new Error(`${key} must be a Discord ID`);
}
async function main() {
    validateConfig();
    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent], allowedMentions: { parse: [] } });
    let player;
    let handlers;
    let stopping;
    async function shutdown() {
        if (stopping) return stopping;
        stopping = (async () => {
            handlers?.shutdown();
            if (player) for (const queue of player.nodes.cache.values()) require('./music_logic/enqueue').cancelImports(queue);
            require('./youtube/prefetch').clear();
            await player?.destroy(); await client.destroy();
        })();
        return stopping;
    }
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
        logger.info('Stopping bot...');
        const timer = setTimeout(() => process.exit(1), 10000).unref();
        shutdown().then(() => clearTimeout(timer)).catch(() => { process.exitCode = 1; });
    });
    try {
        player = await startPlayer(client);
        client.commands = loadCommands();
        client.commandsClassic = require('./commandClassicRegister')();
        handlers = createHandlers(client, player);
        client.on(Events.InteractionCreate, handlers.interaction);
        client.on(Events.MessageCreate, handlers.message);
        client.on(Events.Error, error => logger.error(`[Discord] ${error.code || error.name}`));
        client.once(Events.ClientReady, () => logger.info(`Logged in as ${client.user.tag}; slash and ! commands ready.`));
        if (process.env.REGISTER_COMMANDS !== 'false') await registerCommands(client.commands);
        await client.login(process.env.BOT_TOKEN);
        return { client, player, shutdown };
    } catch (error) { await shutdown(); throw error; }
}
if (require.main === module) main().catch(error => {
    logger.error(`Startup failed: ${error.message}`);
    process.exitCode = 1;
});
module.exports = { main, validateConfig };
