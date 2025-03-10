const crypto = require('crypto');
const moment = require('moment');

// Generate registration code
function generateRegistrationCode(name, nisn) {
    const date = moment().format('YYYYMMDD');
    const hash = crypto.createHash('md5').update(`${name}-${nisn}-${date}`).digest('hex');
    return `PSB${date}${hash.substring(0, 6)}`.toUpperCase();
}

module.exports = {
    generateRegistrationCode
};