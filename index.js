const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Import services
const {
    isPhoneRegistered,
    saveRegistration,
    getRegistrationData,
    updateRegistration,
    checkStatus
} = require('./services/registrationService');

// Import validation functions
const {
    parseRegistrationData,
    parseAnnouncementCheck,
    parseRegistrationCode,
    parseUpdateData
} = require('./services/validationService');

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

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
        try {
            // Check if phone is already registered
            const isRegistered = await isPhoneRegistered(sender);
            
            if (isRegistered) {
                await message.reply(
                    `❌ Maaf, nomor WhatsApp ini sudah terdaftar sebelumnya. Jika ingin mengubah data, gunakan perintah /data [NO PENDAFTARAN] untuk melihat data Anda dan /ubah [NO PENDAFTARAN] untuk mengubah data.`
                );
                return;
            }
            
            const registrationText = content.replace('/daftar', '').trim();
            const registrationResult = parseRegistrationData(registrationText);
            
            if (!registrationResult.isComplete) {
                await message.reply(
                    `Pendaftaran tidak lengkap. Data yang kurang: ${registrationResult.missingFields.join(', ')}.\n\n` +
                    `Silahkan daftar dengan format:\n/daftar\nNama: [Nama Lengkap]\nNISN: [NISN]\nTanggal Lahir: [DD-MM-YYYY]\nAlamat: [Alamat Lengkap]\nNama Orang Tua: [Nama Orang Tua]\nNo. HP: [Nomor HP]\nAsal Sekolah: [Nama Sekolah]`
                );
                return;
            }
            
            const regCode = await saveRegistration(registrationResult.data, sender);
            
            await message.reply(
                `✅ Pendaftaran berhasil!\n\n` +
                `Nama: ${registrationResult.data.name}\n` +
                `NISN: ${registrationResult.data.nisn}\n` +
                `Kode Pendaftaran: ${regCode}\n\n` +
                `Mohon simpan kode pendaftaran dengan baik. Kode ini diperlukan untuk memeriksa status kelulusan Anda, mengubah data, atau melihat data Anda.\n\n` +
                `Untuk melihat data pendaftaran Anda:\n` +
                `/data ${regCode}\n\n` +
                `Untuk mengubah data pendaftaran Anda:\n` +
                `/ubah ${regCode}\n\n` +
                `Untuk memeriksa pengumuman kelulusan:\n` +
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
    // Handle data view command
    else if (content.startsWith('/data')) {
        const parseResult = parseRegistrationCode(content, '/data');
        
        if (!parseResult.isComplete) {
            await message.reply(parseResult.message);
            return;
        }
        
        try {
            const regData = await getRegistrationData(parseResult.regCode);
            
            if (!regData.found) {
                await message.reply(
                    '❌ Data tidak ditemukan. Periksa kembali Kode Pendaftaran Anda.'
                );
                return;
            }
            
            // Security check - only allow the original WhatsApp number to view data
            if (regData.data.whatsAppNumber !== sender) {
                await message.reply(
                    '❌ Anda tidak berhak melihat data ini. Nomor WhatsApp tidak sesuai dengan pendaftaran awal.'
                );
                return;
            }
            
            await message.reply(
                `📋 Data Pendaftaran\n\n` +
                `Kode Pendaftaran: ${regData.data.registrationCode}\n` +
                `Nama: ${regData.data.name}\n` +
                `NISN: ${regData.data.nisn}\n` +
                `Tanggal Lahir: ${regData.data.birthDate}\n` +
                `Alamat: ${regData.data.address}\n` +
                `Nama Orang Tua: ${regData.data.parentName}\n` +
                `No. HP: ${regData.data.phoneNumber}\n` +
                `Asal Sekolah: ${regData.data.school}\n` +
                `Status: ${regData.data.status}\n` +
                `Tanggal Pendaftaran: ${regData.data.timestamp}\n\n` +
                `Untuk mengubah data Anda, gunakan perintah:\n` +
                `/ubah ${regData.data.registrationCode}\nNama: [Nama Baru]\nNISN: [NISN Baru]\n...\n\n` +
                `Catatan: Anda hanya perlu mengisi data yang ingin diubah.`
            );
        } catch (error) {
            console.error('Error retrieving data:', error);
            await message.reply(
                '❌ Terjadi kesalahan saat mengambil data. Silahkan coba lagi nanti atau hubungi admin.'
            );
        }
    }
    // Handle update data command
    else if (content.startsWith('/ubah')) {
        const updateResult = parseUpdateData(content);
        
        if (!updateResult.isComplete) {
            await message.reply(updateResult.message);
            return;
        }
        
        try {
            const result = await updateRegistration(updateResult.regCode, updateResult.data, sender);
            
            if (!result.success) {
                await message.reply(result.message);
                return;
            }
            
            // Get updated data to show to user
            const regData = await getRegistrationData(updateResult.regCode);
            
            await message.reply(
                `✅ ${result.message}\n\n` +
                `Data terbaru:\n` +
                `Kode Pendaftaran: ${regData.data.registrationCode}\n` +
                `Nama: ${regData.data.name}\n` +
                `NISN: ${regData.data.nisn}\n` +
                `Tanggal Lahir: ${regData.data.birthDate}\n` +
                `Alamat: ${regData.data.address}\n` +
                `Nama Orang Tua: ${regData.data.parentName}\n` +
                `No. HP: ${regData.data.phoneNumber}\n` +
                `Asal Sekolah: ${regData.data.school}\n` +
                `Status: ${regData.data.status}`
            );
        } catch (error) {
            console.error('Error updating data:', error);
            await message.reply(
                '❌ Terjadi kesalahan saat mengubah data. Silahkan coba lagi nanti atau hubungi admin.'
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
            `2️⃣ /data [NO PENDAFTARAN] - Untuk melihat data pendaftaran Anda\n\n` +
            `3️⃣ /ubah [NO PENDAFTARAN] - Untuk mengubah data pendaftaran\n` +
            `Format:\n/ubah [NO PENDAFTARAN]\nNama: [Nama Baru]\nNISN: [NISN Baru]\n...\n` +
            `(Isi hanya data yang ingin diubah)\n\n` +
            `4️⃣ /pengumuman [NISN] [TGL LAHIR] [NO PENDAFTARAN] - Untuk memeriksa status kelulusan\n\n` +
            `5️⃣ /help atau /bantuan - Menampilkan menu bantuan`
        );
    }
});

// Initialize the client
client.initialize();
console.log('Initializing WhatsApp client...');