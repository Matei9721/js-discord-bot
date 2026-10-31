const fs = require('node:fs');
const path = require('node:path');
module.exports = function () {
    const result = new Map();
    for (const file of fs.readdirSync(path.join(__dirname, 'commands_classic')).filter(file => file.endsWith('.js'))) {
        const command = require(path.join(__dirname, 'commands_classic', file));
        result.set(command.data.name.toLowerCase(), command);
    }
    return result;
};
