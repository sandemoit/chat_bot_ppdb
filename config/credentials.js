const fs = require('fs');

// Load credentials from JSON file
const loadCredentials = () => {
    try {
        return JSON.parse(fs.readFileSync('credentials.json'));
    } catch (error) {
        console.error('Error loading credentials:', error);
        throw error;
    }
};

module.exports = {
    loadCredentials
};