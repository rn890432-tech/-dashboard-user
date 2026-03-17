const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendVerificationEmail(email, token) {
  const url = `${process.env.FRONTEND_URL}/onboarding/verify?token=${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify your CyberChef account',
    html: `<p>Click <a href="${url}">here</a> to verify your account.</p>`
  });
}

module.exports = { sendVerificationEmail };
