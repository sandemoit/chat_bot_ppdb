const { GoogleSpreadsheet } = require('google-spreadsheet');
const { loadCredentials } = require('../config/credentials');

let sheet = null;

// Initialize Google Sheets and load the worksheet
async function initializeSheets() {
    try {
        if (sheet) return sheet;
        
        console.log('Starting sheets initialization...');
        const CREDENTIALS = loadCredentials();
        
        const doc = new GoogleSpreadsheet(CREDENTIALS.sheet_id);

        await doc.useServiceAccountAuth({
            client_email: CREDENTIALS.client_email,
            private_key: CREDENTIALS.private_key.replace(/\\n/g, '\n')
        });
        
        console.log('Authentication successful, loading spreadsheet...');
        await doc.loadInfo();
        console.log(`Spreadsheet loaded: ${doc.title}`);
        
        // Check if registration sheet exists, create if not
        let registrationSheet = doc.sheetsByTitle['Registrations'];
        if (!registrationSheet) {
            console.log('Creating Registrations sheet...');
            registrationSheet = await doc.addSheet({ 
                title: 'Registrations', 
                headerValues: ['Timestamp', 'Name', 'NISN', 'BirthDate', 'Address', 'ParentName', 
                            'PhoneNumber', 'School', 'RegistrationCode', 'Status', 'WhatsAppNumber'] 
            });
            console.log('Sheet created successfully');
        } else {
            console.log('Found existing Registrations sheet');
        }
        
        sheet = registrationSheet;
        return sheet;
    } catch (error) {
        console.error('Error initializing sheets:', error);
        console.error('Credentials client_email:', CREDENTIALS.client_email);
        console.error('Sheet ID:', CREDENTIALS.sheet_id);
        throw error;
    }
}

// Get all rows from the sheet
async function getAllRows() {
    const sheet = await initializeSheets();
    return await sheet.getRows();
}

// Add a new row to the sheet
async function addRow(rowData) {
    const sheet = await initializeSheets();
    return await sheet.addRow(rowData);
}

module.exports = {
    initializeSheets,
    getAllRows,
    addRow
};