const moment = require('moment');
const { getAllRows, addRow } = require('./sheetService');
const { generateRegistrationCode } = require('../utils/helpers');

// Check if phone number already registered
async function isPhoneRegistered(phone) {
    try {
        const rows = await getAllRows();
        
        // Find if phone number exists in WhatsAppNumber column
        return rows.some(row => row.WhatsAppNumber === phone);
    } catch (error) {
        console.error('Error checking phone registration:', error);
        throw error;
    }
}

// Save registration data to spreadsheet
async function saveRegistration(data, phone) {
    try {
        console.log('Starting registration process...');
        const registrationCode = generateRegistrationCode(data.name, data.nisn);
        
        console.log('Adding row to spreadsheet...');
        // Add row to spreadsheet
        await addRow({
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

// Get registration data by registration code
async function getRegistrationData(regCode) {
    try {
        const rows = await getAllRows();
        
        const studentRow = rows.find(row => row.RegistrationCode === regCode);
        
        if (!studentRow) {
            return { found: false };
        }
        
        return {
            found: true,
            data: {
                name: studentRow.Name,
                nisn: studentRow.NISN,
                birthDate: studentRow.BirthDate,
                address: studentRow.Address,
                parentName: studentRow.ParentName,
                phoneNumber: studentRow.PhoneNumber,
                school: studentRow.School,
                registrationCode: studentRow.RegistrationCode,
                status: studentRow.Status,
                timestamp: studentRow.Timestamp,
                whatsAppNumber: studentRow.WhatsAppNumber
            },
            rowIndex: rows.indexOf(studentRow)
        };
    } catch (error) {
        console.error('Error getting registration data:', error);
        throw error;
    }
}

// Update registration data
async function updateRegistration(regCode, data, phone) {
    try {
        console.log(`Starting update process for ${regCode}...`);
        const registrationInfo = await getRegistrationData(regCode);
        
        if (!registrationInfo.found) {
            return { success: false, message: 'Data tidak ditemukan. Periksa kembali Kode Pendaftaran Anda.' };
        }
        
        // Check if the WhatsApp number matches the one in the registration
        if (registrationInfo.data.whatsAppNumber !== phone) {
            return { 
                success: false, 
                message: 'Anda tidak berhak mengubah data ini. Nomor WhatsApp tidak sesuai dengan pendaftaran awal.' 
            };
        }
        
        const rows = await getAllRows();
        const row = rows[registrationInfo.rowIndex];
        
        // Update the data
        row.Name = data.name || row.Name;
        row.NISN = data.nisn || row.NISN;
        row.BirthDate = data.birthDate || row.BirthDate;
        row.Address = data.address || row.Address;
        row.ParentName = data.parentName || row.ParentName;
        row.PhoneNumber = data.phoneNumber || row.PhoneNumber;
        row.School = data.school || row.School;
        
        // Save the changes
        await row.save();
        
        console.log(`Registration updated for ${data.name || row.Name} with code ${regCode}`);
        return { 
            success: true, 
            message: `Data pendaftaran berhasil diperbarui untuk ${data.name || row.Name}` 
        };
    } catch (error) {
        console.error('Error updating registration:', error);
        throw error;
    }
}

// Check registration status
async function checkStatus(nisn, birthDate, regCode) {
    try {
        const rows = await getAllRows();
        
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

module.exports = {
    isPhoneRegistered,
    saveRegistration,
    getRegistrationData,
    updateRegistration,
    checkStatus
};