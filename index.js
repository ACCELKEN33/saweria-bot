const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const express = require('express');

// --- 1. KONFIGURASI BOT DISCORD ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
    ]
});

// SIMPAN DATABASE SEMENTARA (PIN Donasi & Discord ID)
// Format: { "PIN-1234": { used: false } }
const donationPins = {};

// Ganti dengan ID Role VIP di server Discord kamu
const VIP_ROLE_ID = '1565016485494005901';

client.once('ready', () => {
    console.log(`Bot Discord aktif sebagai ${client.user.tag}`);
});

// --- 2. SETUP SERVER EXPRESS UNTUK WEBHOOK SAWERIA ---
const app = express();
app.use(express.json());

// Endpoint Webhook yang dihubungkan ke Localtunnel/Saweria
app.post('/webhook/saweria', (req, res) => {
    const data = req.body;
    
    // Validasi data dari Saweria (bisa disesuaikan dengan struktur payload Saweria)
    console.log('Donasi masuk:', data);

    // Generate PIN Unik (contoh: VIP-8921)
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const pin = `VIP-${randomNum}`;

    // Simpan PIN ke database sementara
    donationPins[pin] = { used: false };

    // Di sini kamu juga bisa mengirimkan PIN ke email/notifikasi donatur atau log ke console
    console.log(`PIN Verifikasi dibuat untuk donasi ini: ${pin}`);

    res.status(200).json({ status: 'success', pin });
});

// Jalankan server di port 3000
app.listen(3000, () => {
    console.log('Webhook server berjalan di port 3000');
});


// --- 3. KIRIM PESAN TOMBOL VERIFIKASI KE CHANNEL ---
// Kamu bisa jalankan perintah ini via chat admin atau buat event siap pakai
client.on('messageCreate', async message => {
    if (message.content === '!setup-verify' && message.member.permissions.has('Administrator')) {
        const embed = new EmbedBuilder()
            .setTitle('⭐ Verifikasi Member VIP ⭐')
            .setDescription('Sudah berdonasi melalui Saweria? Klik tombol di bawah ini untuk memasukkan kode PIN verifikasi kamu dan dapatkan akses VIP secara otomatis!')
            .setColor('#FFD700');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('open_verify_modal')
                    .setLabel('Verifikasi VIP')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔑')
            );

        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete();
    }
});


// --- 4. HANDLE KLIK TOMBOL & POP-UP FORM (MODAL) ---
client.on('interactionCreate', async interaction => {
    if (interaction.isButton() && interaction.customId === 'open_verify_modal') {
        // Munculkan Pop-up Form (Modal)
        const modal = new ModalBuilder()
            .setCustomId('verify_modal')
            .setTitle('Verifikasi Kode VIP Saweria');

        const pinInput = new TextInputBuilder()
            .setCustomId('pin_input')
            .setLabel('Masukkan Kode PIN dari Saweria')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Contoh: VIP-XXXX')
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(pinInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
    }

    // Handle saat user mengisi form dan klik Submit
    if (interaction.isModalSubmit() && interaction.customId === 'verify_modal') {
        const userPin = interaction.fields.getTextInputValue('pin_input').trim();

        // Cek apakah PIN valid dan belum digunakan
        if (donationPins[userPin] && !donationPins[userPin].used) {
            donationPins[userPin].used = true; // Tandai PIN sudah dipakai

            try {
                const member = interaction.member;
                await member.roles.add(VIP_ROLE_ID); // Berikan Role VIP

                await interaction.reply({
                    content: '🎉 **Verifikasi Berhasil!** Role VIP kamu sudah aktif. Silakan cek channel khusus VIP di server ini.',
                    ephemeral: true // Hanya bisa dilihat oleh user yang bersangkutan (tidak bikin spam)
                });
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: 'Terjadi kesalahan saat memberikan role. Harap hubungi Admin.',
                    ephemeral: true
                });
            }
        } else {
            await interaction.reply({
                content: '❌ **PIN Salah atau Sudah Digunakan!** Pastikan kamu memasukkan kode PIN yang valid dari data donasi Saweria.',
                ephemeral: true
            });
        }
    }
});

// Masukkan Token Bot Discord kamu di sini
client.login(process.env.DISCORD_TOKEN)