import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.SMTP_PASS);

export async function sendOtpEmail(to, code, options = {}) {
	const msg = {
		to,
		from: process.env.FROM_EMAIL,
		subject: options.subject || "Your Verification Code",
		text: options.text || `Your verification code is ${code}. It expires in 10 minutes.`,
		html: options.html || `<p>Your code: <strong>${code}</strong></p>`,
	};
	await sgMail.send(msg);
}

export async function sendResetEmail(to, resetLink, options = {}) {
	const msg = {
		to,
		from: process.env.FROM_EMAIL,
		subject: options.subject || "Reset Your Password",
		text: options.text || `Reset here: ${resetLink}`,
		html: options.html || `<p><a href="${resetLink}">${resetLink}</a></p>`,
	};
	await sgMail.send(msg);
}
