const nodemailer = require('nodemailer');

const sendEmail = async (recipient, subject, text, html) => {
    // Konfiguroidaan Nodemailer käyttämään Outlookin SMTP-palvelinta
    let transporter = nodemailer.createTransport({
        host: "smtp-mail.outlook.com", // Outlookin SMTP-palvelimen osoite
        secureConnection: false, // Käytetään TLS:ää
        port: 587, // Standardi SMTP-portti
        tls: {
          ciphers:'SSLv3'
        },
        auth: {
            user: 'your-outlook-email@outlook.com', // Korvaa omalla Outlook-sähköpostiosoitteellasi
            pass: 'your-outlook-password' // Korvaa omalla Outlook-salasanallasi
        }
    });

    const mailOptions = {
        from: 'your-outlook-email@outlook.com', // Lähettäjän sähköpostiosoite
        to: recipient, // Vastaanottajan sähköpostiosoite
        subject: subject, // Sähköpostin aihe
        text: text, // Viestin tekstisisältö
        html: html // HTML-muotoinen viestin sisältö (valinnainen)
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return { success: true, message: 'Email sent', info: info };
    } catch (error) {
        console.error('Error sending email: ' + error);
        return { success: false, message: 'Error sending email', error: error };
    }
};

module.exports = { sendEmail };



/*
seuraavalla funktiolla voi käyttää sendEmail-funktiota:

const { sendEmail } = require('./email/emailService');

sendEmail('recipient@example.com', 'Test Subject', 'This is the plain text body', '<h1>This is HTML body</h1>');

*/