// src/utils/email.js
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: Number(process.env.SMTP_PORT),
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

/**
 * Send an email with an OTP code (e.g. for verification).
 *
 * @param {string} to – recipient email
 * @param {string} code – the OTP code
 * @param {object} [options] – optional overrides: subject, text, html
 */
export async function sendOtpEmail(to, code, options = {}) {
	const defaultSubject = "Your Verification Code";
	const defaultHtml = `<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`;
	const defaultText = `Your verification code is ${code}. It expires in 10 minutes.`;

	const mailOptions = {
		from: process.env.FROM_EMAIL,
		to,
		subject: options.subject || defaultSubject,
		text: options.text || defaultText,
		html: options.html || defaultHtml,
	};

	console.log(`📧 [DEV] sendOtpEmail to=${to}, code=${code}`);
	await transporter.sendMail(mailOptions);
}

/**
 * Send an email containing a one-time password‐reset link.
 *
 * @param {string} to 
 * @param {string} resetLink 
 * @param {object} [options] 
 */
export async function sendResetEmail(to, resetLink, options = {}) {
	const defaultSubject = "Reset Your Password";
	const defaultHtml = `
    <p>Someone (hopefully you) requested a password reset.</p>
    <p>Click the link below to set a new password — it will expire in 1 hour:</p>
    <p><a href="${resetLink}">${resetLink}</a></p>
    <p>If you didn't request this, just ignore this email.</p>
  `;
	const defaultText = `
    Someone (hopefully you) requested a password reset.
    Use this link to set a new password (expires in 1 hour):
    ${resetLink}
    If you didn't request this, ignore this message.
  `;

	const mailOptions = {
		from: process.env.FROM_EMAIL,
		to,
		subject: options.subject || defaultSubject,
		text: options.text || defaultText,
		html: options.html || defaultHtml,
	};

	console.log(`📧 [DEV] sendResetEmail to=${to}, link=${resetLink}`);
	await transporter.sendMail(mailOptions);
}
