import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth:{
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

const sendEmail = async (options) => {
    const mailOptions ={
        from: '"SyncEditor" <no-reply@synceditor.com>',
        to: options.email,
        subject: options.subject,
        html: options.message
    };
    await transporter.sendMail(mailOptions);
}

export default sendEmail;