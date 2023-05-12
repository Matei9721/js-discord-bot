const {createLogger, format, transports} = require("winston");
const path = require('path');

const logger = createLogger({
    // Change logging level here for the whole class
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.label({ label: path.basename(process.mainModule.filename) }),
        format.printf(info => `[${info.timestamp}] [${info.label}] [${info.level.toUpperCase()}] ${info.message}`)
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: path.join(__dirname, 'logs', 'error.log'), level: 'error' }),
        new transports.File({ filename: path.join(__dirname, 'logs', 'combined.log'), level: 'debug'  })
    ]
});

module.exports = logger;