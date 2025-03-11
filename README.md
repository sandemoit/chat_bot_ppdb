# WhatsApp Bot Pendaftaran Peserta Didik Baru

## Overview

A WhatsApp bot for student registration that automatically stores data in Google Sheets. This bot allows students to submit their registration information through WhatsApp messages and compiles all data into a spreadsheet for easy management.

## Features

- Automated data collection via WhatsApp
- Google Sheets integration for data storage
- Simple registration command structure
- Duplicate entry detection
- Automatic confirmation messages

## Prerequisites

- Node.js (v10 or higher)
- NPM
- Google Cloud account
- Google Sheets API access
- WhatsApp account for the bot

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/wa-bot-ppdb.git
cd wa-bot-ppdb
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select your existing "wa-bot-ppdb" project
3. Enable the Google Sheets API for your project
4. Create a service account:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Give it a name and description
   - Grant it the "Editor" role for Google Sheets
   - Click "Create"
5. Create and download a JSON key:
   - Find your service account in the list
   - Click on the three dots menu (actions) and select "Manage keys"
   - Click "Add Key" > "Create new key"
   - Select JSON format
   - Click "Create" - this will download the JSON key file

### 4. Share Google Sheet

1. Create a Google Sheet for storing registration data
2. Share the sheet with your service account:
   - Open your spreadsheet
   - Click the "Share" button in the top right corner
   - Add the service account email (found in the `client_email` field of your JSON key file)
   - Give it "Editor" permission
   - Click "Share"
3. Add new row the `sheet_id` after `universe_domain` environment variables in the `credentials.json` file

## Usage

### Starting the Bot

Run the bot with:

```bash
npm run dev
```

Scan the displayed QR code with WhatsApp to authenticate the bot.

### Registration Format

Users can register by sending a message to the bot with the following format:

```
/daftar
Nama: [Full Name]
NISN: [Student ID]
Tanggal Lahir: [Birth Date DD-MM-YYYY]
Alamat: [Address]
Nama Orang Tua: [Parent's Name]
No. HP: [Phone Number]
Asal Sekolah: [Previous School]
```

Example:

```
/daftar
Nama: Sandi Maulidika
NISN: 200221
Tanggal Lahir: 01-01-2005
Alamat: Jl. Contoh No. 123
Nama Orang Tua: Budi Santoso
No. HP: 081234567890
Asal Sekolah: SMP Contoh
```

## Project Structure

```
wa-bot-ppdb/
├── config/           # Configuration files
│   ├── credentials.js # Google service account credentials
├── index.js          # Main bot application
├── services/         # Service layer
│   ├── registrationService.js # Registration service
│   ├── registrationService.js # Registration service
│   └── validationService.js # Google Sheets service
├── utils/            # Utility functions
│   └── helpers.js     # Helper functions
└── README.md         # This file
```

## Troubleshooting

### Common Issues

- **QR Code Not Displaying**: Check if your terminal supports QR code display or use an alternative QR code generator
- **Authentication Errors**: Verify your Google service account credentials are correct
- **Permission Denied**: Ensure your Google Sheet is properly shared with the service account email
- **Connection Issues**: Check your internet connection and WhatsApp Web status

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE)

## Acknowledgements

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- [google-spreadsheet](https://github.com/theoephraim/node-google-spreadsheet)
