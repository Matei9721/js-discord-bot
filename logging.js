const { createLogger, format, transports } = require('winston');
module.exports = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(format.timestamp(), format.printf(info => `[${info.timestamp}] [${info.level.toUpperCase()}] ${info.message}`)),
    transports: [new transports.Console()]
});
