const nodemailer = require('nodemailer');

const sendEmail = async (recipient, subject, text, html) => {
    // Konfiguroidaan Nodemailer käyttämään Outlookin SMTP-palvelinta
    let transporter = nodemailer.createTransport({
        host: "smtp-mail.outlook.com", // Outlookin SMTP-palvelimen osoite
        secureConnection: false, // Käytetään TLS:ää
        port: 587, // Standardi SMTP-portti
        auth: {
            user: process.env.EMAIL_USER, // Käyttäen ympäristömuuttujaa Outlook-sähköpostiosoitteelle
            pass: process.env.EMAIL_PASS // Käyttäen ympäristömuuttujaa Outlook-salasanalle
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER, // Lähettäjän sähköpostiosoite, käyttäen ympäristömuuttujaa
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
