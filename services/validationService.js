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

// Parse registration code from message
function parseRegistrationCode(message, command) {
    // Expected format: /data [NO PENDAFTARAN] or /ubah [NO PENDAFTARAN]
    const regCode = message.replace(command, '').trim();
    
    if (!regCode) {
        return {
            isComplete: false,
            message: `Format tidak valid. Gunakan: ${command} [NO PENDAFTARAN]`
        };
    }
    
    return {
        isComplete: true,
        regCode: regCode
    };
}

// Parse update data from message
function parseUpdateData(message) {
    const lines = message.split('\n');
    const firstLine = lines[0].trim();
    
    // Extract registration code from first line
    // Expected format: /ubah [NO PENDAFTARAN]
    const regCode = firstLine.replace('/ubah', '').trim();
    
    if (!regCode) {
        return {
            isComplete: false,
            message: 'Format tidak valid. Gunakan: /ubah [NO PENDAFTARAN]\nNama: [Nama Lengkap]\nNISN: [NISN]\n...'
        };
    }
    
    // Parse the data fields that need to be updated
    let data = {};
    let dataPresent = false;
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('Nama:')) {
            data.name = line.replace('Nama:', '').trim();
            dataPresent = true;
        } else if (line.startsWith('NISN:')) {
            data.nisn = line.replace('NISN:', '').trim();
            dataPresent = true;
        } else if (line.startsWith('Tanggal Lahir:')) {
            data.birthDate = line.replace('Tanggal Lahir:', '').trim();
            dataPresent = true;
        } else if (line.startsWith('Alamat:')) {
            data.address = line.replace('Alamat:', '').trim();
            dataPresent = true;
        } else if (line.startsWith('Nama Orang Tua:')) {
            data.parentName = line.replace('Nama Orang Tua:', '').trim();
            dataPresent = true;
        } else if (line.startsWith('No. HP:')) {
            data.phoneNumber = line.replace('No. HP:', '').trim();
            dataPresent = true;
        } else if (line.startsWith('Asal Sekolah:')) {
            data.school = line.replace('Asal Sekolah:', '').trim();
            dataPresent = true;
        }
    }
    
    if (!dataPresent) {
        return {
            isComplete: false,
            message: 'Tidak ada data yang diubah. Format: /ubah [NO PENDAFTARAN]\nNama: [Nama Lengkap]\nNISN: [NISN]\n...'
        };
    }
    
    return {
        isComplete: true,
        regCode: regCode,
        data: data
    };
}

module.exports = {
    parseRegistrationData,
    parseAnnouncementCheck,
    parseRegistrationCode,
    parseUpdateData
};