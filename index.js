const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const moment = require('moment');
const crypto = require('crypto');
const fs = require('fs');

// Load credentials from JSON file
const CREDENTIALS = JSON.parse(fs.readFileSync('credentials.json'));

// Configure Google Sheets
const doc = new GoogleSpreadsheet(CREDENTIALS.sheet_id);

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Generate registration code
function generateRegistrationCode(name, nisn) {
    const date = moment().format('YYYYMMDD');
    const hash = crypto.createHash('md5').update(`${name}-${nisn}-${date}`).digest('hex');
    return `PSB${date}${hash.substring(0, 6)}`.toUpperCase();
}

// Initialize Google Sheets and load the worksheet
async function initializeSheets() {
    try {
        console.log('Starting sheets initialization...');

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
        
        return registrationSheet;
    } catch (error) {
        console.error('Error initializing sheets:', error);
        console.error('Credentials client_email:', CREDENTIALS.client_email);
        console.error('Sheet ID:', CREDENTIALS.sheet_id);
        // Don't log private key for security
        throw error;
    }
}

// Save registration data to spreadsheet
async function saveRegistration(data, phone) {
    try {
        console.log('Starting registration process...');
        const sheet = await initializeSheets();
        const registrationCode = generateRegistrationCode(data.name, data.nisn);
        
        console.log('Adding row to spreadsheet...');
        // Add row to spreadsheet
        await sheet.addRow({
            Timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
            Name: data.name,
            NISN: data.nisn,
            BirthDate: data.birthDate,
            Address: data.address,
            ParentName: data.parentName,
            PhoneNumber: data.phoneNumber,
            School: data.school,
            RegistrationCode: registrationCode,
            Status: 'Review',
            WhatsAppNumber: phone
        });
        
        console.log(`Registration saved for ${data.name} with code ${registrationCode}`);
        return registrationCode;
    } catch (error) {
        console.error('Error saving registration:', error);
        throw error;
    }
}

// Check registration status
async function checkStatus(nisn, birthDate, regCode) {
    try {
        const sheet = await initializeSheets();
        const rows = await sheet.getRows();
        
        const studentRow = rows.find(row => 
            row.NISN === nisn && 
            row.BirthDate === birthDate && 
            row.RegistrationCode === regCode
        );
        
        if (!studentRow) {
            return {
                found: false,
                message: 'Data tidak ditemukan. Periksa kembali NISN, Tanggal Lahir, dan Kode Pendaftaran Anda.'
            };
        }
        
        return {
            found: true,
            name: studentRow.Name,
            status: studentRow.Status,
            message: studentRow.Status === 'Lulus' ? 
                `Selamat! Anda dinyatakan LULUS seleksi. Silahkan datang ke sekolah untuk proses selanjutnya.` :
                studentRow.Status === 'Tidak Lulus' ? 
                `Mohon maaf, Anda dinyatakan TIDAK LULUS seleksi. Terima kasih atas partisipasi Anda.` :
                `Status pendaftaran Anda masih dalam proses REVIEW. Harap periksa kembali nanti.`
        };
    } catch (error) {
        console.error('Error checking status:', error);
        throw error;
    }
}

// Parse registration data from message
function parseRegistrationData(message) {
    const lines = message.split('\n');
    let data = {};
    
    lines.forEach(line => {
        if (line.startsWith('Nama:')) {
            data.name = line.replace('Nama:', '').trim();
        } else if (line.startsWith('NISN:')) {
            data.nisn = line.replace('NISN:', '').trim();
        } else if (line.startsWith('Tanggal Lahir:')) {
            data.birthDate = line.replace('Tanggal Lahir:', '').trim();
        } else if (line.startsWith('Alamat:')) {
            data.address = line.replace('Alamat:', '').trim();
        } else if (line.startsWith('Nama Orang Tua:')) {
            data.parentName = line.replace('Nama Orang Tua:', '').trim();
        } else if (line.startsWith('No. HP:')) {
            data.phoneNumber = line.replace('No. HP:', '').trim();
        } else if (line.startsWith('Asal Sekolah:')) {
            data.school = line.replace('Asal Sekolah:', '').trim();
        }
    });
    
    // Check if all required fields are filled
    const requiredFields = ['name', 'nisn', 'birthDate', 'address', 'parentName', 'phoneNumber', 'school'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
        return {
            isComplete: false,
            missingFields: missingFields
        };
    }
    
    return {
        isComplete: true,
        data: data
    };
}

// Parse announcement check message
function parseAnnouncementCheck(message) {
    // Expected format: /pengumuman [NISN] [TGL LAHIR] [NO PENDAFTARAN]
    const parts = message.replace('/pengumuman', '').trim().split(' ');
    
    if (parts.length < 3) {
        return {
            isComplete: false,
            message: 'Format tidak valid. Gunakan: /pengumuman [NISN] [TGL LAHIR] [NO PENDAFTARAN]'
        };
    }
    
    return {
        isComplete: true,
        nisn: parts[0],
        birthDate: parts[1],
        regCode: parts[2]
    };
}

// WhatsApp client events
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR Code generated. Scan to authenticate.');
});

client.on('ready', () => {
    console.log('WhatsApp client is ready!');
});

client.on('message', async (message) => {
    const content = message.body.trim();
    const sender = message.from;
    
    // Handle registration command
    if (content.startsWith('/daftar')) {
        const registrationText = content.replace('/daftar', '').trim();
        const registrationResult = parseRegistrationData(registrationText);
        
        if (!registrationResult.isComplete) {
            await message.reply(
                `Pendaftaran tidak lengkap. Data yang kurang: ${registrationResult.missingFields.join(', ')}.\n\n` +
                `Silahkan daftar dengan format:\n/daftar\nNama: [Nama Lengkap]\nNISN: [NISN]\nTanggal Lahir: [DD-MM-YYYY]\nAlamat: [Alamat Lengkap]\nNama Orang Tua: [Nama Orang Tua]\nNo. HP: [Nomor HP]\nAsal Sekolah: [Nama Sekolah]`
            );
            return;
        }
        
        try {
            const regCode = await saveRegistration(registrationResult.data, sender);
            
            await message.reply(
                `✅ Pendaftaran berhasil!\n\n` +
                `Nama: ${registrationResult.data.name}\n` +
                `NISN: ${registrationResult.data.nisn}\n` +
                `Kode Pendaftaran: ${regCode}\n\n` +
                `Mohon simpan kode pendaftaran dengan baik. Kode ini diperlukan untuk memeriksa status kelulusan Anda.\n\n` +
                `Untuk memeriksa pengumuman kelulusan, gunakan format:\n` +
                `/pengumuman ${registrationResult.data.nisn} ${registrationResult.data.birthDate} ${regCode}`
            );
        } catch (error) {
            console.error('Error in registration process:', error);
            await message.reply(
                '❌ Terjadi kesalahan saat memproses pendaftaran. Silahkan coba lagi nanti atau hubungi admin.'
            );
        }
    }
    // Handle announcement check command
    else if (content.startsWith('/pengumuman')) {
        const checkResult = parseAnnouncementCheck(content);
        
        if (!checkResult.isComplete) {
            await message.reply(checkResult.message);
            return;
        }
        
        try {
            const statusResult = await checkStatus(
                checkResult.nisn, 
                checkResult.birthDate, 
                checkResult.regCode
            );
            
            if (!statusResult.found) {
                await message.reply(statusResult.message);
                return;
            }
            
            await message.reply(
                `📋 Hasil Pengumuman Seleksi\n\n` +
                `Nama: ${statusResult.name}\n` +
                `NISN: ${checkResult.nisn}\n` +
                `Status: ${statusResult.status}\n\n` +
                `${statusResult.message}`
            );
        } catch (error) {
            console.error('Error checking announcement:', error);
            await message.reply(
                '❌ Terjadi kesalahan saat memeriksa pengumuman. Silahkan coba lagi nanti atau hubungi admin.'
            );
        }
    }
    // Handle help command
    else if (content === '/help' || content === '/bantuan') {
        await message.reply(
            `🤖 Bot Pendaftaran Siswa Baru\n\n` +
            `Perintah yang tersedia:\n\n` +
            `1️⃣ /daftar - Untuk mendaftar sebagai siswa baru\n` +
            `Format:\n/daftar\nNama: [Nama Lengkap]\nNISN: [NISN]\nTanggal Lahir: [DD-MM-YYYY]\nAlamat: [Alamat Lengkap]\nNama Orang Tua: [Nama Orang Tua]\nNo. HP: [Nomor HP]\nAsal Sekolah: [Nama Sekolah]\n\n` +
            `2️⃣ /pengumuman [NISN] [TGL LAHIR] [NO PENDAFTARAN] - Untuk memeriksa status kelulusan\n\n` +
            `3️⃣ /help atau /bantuan - Menampilkan menu bantuan`
        );
    }
});

client.initialize();
console.log('Initializing WhatsApp client...');