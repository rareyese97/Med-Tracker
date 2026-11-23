import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Shared Medicine Tracker email shell. The palette mirrors the app's stone
// background and slate dark-mode surfaces, with the app's green action color.
function escapeHtml(value = "") {
	return String(value).replace(/[&<>"']/g, (character) => {
		const entities = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		};
		return entities[character];
	});
}

function buildEmailHtml({ preheader, title, intro, contentHtml }) {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="color-scheme" content="light">
	<meta name="supported-color-schemes" content="light">
	<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
	<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f5f4;padding:36px 12px;">
		<tr>
			<td align="center">
				<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;background-color:#ffffff;border:1px solid #e7e5e4;border-radius:14px;overflow:hidden;">
					<tr>
						<td style="padding:28px 32px;background-color:#1e293b;color:#ffffff;">
							<p style="margin:0;font-size:13px;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;color:#e7e5e4;">Med-Tracker.app</p>
							<h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;font-weight:700;color:#ffffff;">${escapeHtml(title)}</h1>
						</td>
					</tr>
					<tr>
						<td style="padding:32px;">
							<p style="margin:0 0 20px;font-size:16px;line-height:1.65;color:#374151;">${intro}</p>
							${contentHtml}
						</td>
					</tr>
					<tr>
						<td style="padding:18px 32px;background-color:#fafaf9;border-top:1px solid #e7e5e4;">
							<p style="margin:0;font-size:12px;line-height:1.6;color:#57534e;">This is an automated message from Medicine Tracker. Please do not reply to this email.</p>
						</td>
					</tr>
				</table>
				<p style="margin:16px 0 0;font-size:11px;line-height:1.5;color:#57534e;">Helping you stay on track with your medications.</p>
			</td>
		</tr>
	</table>
</body>
</html>`;
}

async function sendEmail({ to, subject, text, html }) {
	await sgMail.send({
		to,
		from: process.env.FROM_EMAIL,
		subject,
		text,
		html,
	});
}

export async function sendOtpEmail(to, code, options = {}) {
	const safeCode = escapeHtml(code);
	const text =
		options.text ||
		`Welcome to Medicine Tracker!

Use the verification code below to confirm your email address:

${code}

This code expires in 10 minutes. For your security, do not share it with anyone.

If you did not create a Medicine Tracker account, you can safely ignore this email.`;
	const html =
		options.html ||
		buildEmailHtml({
			preheader: "Your Medicine Tracker verification code is inside.",
			title: "Verify your email address",
			intro: "Thanks for creating a Medicine Tracker account. Enter this verification code in the app to confirm your email address:",
			contentHtml: `
				<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;background-color:#f5f5f4;border:1px solid #e7e5e4;border-radius:10px;">
					<tr><td align="center" style="padding:20px 12px;">
						<p style="margin:0 0 8px;color:#57534e;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">Your verification code</p>
						<p style="margin:0;color:#1e293b;font-size:34px;line-height:1.3;font-weight:700;letter-spacing:9px;">${safeCode}</p>
					</td></tr>
				</table>
				<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#57534e;">This code expires in <strong>10 minutes</strong>. For your security, never share it with anyone.</p>
				<p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#57534e;">If you didn't create a Medicine Tracker account, you can safely ignore this email.</p>`,
		});

	await sendEmail({
		to,
		subject: options.subject || "Verify your email | Medicine Tracker",
		text,
		html,
	});
}

export async function sendResetEmail(to, resetLink) {
	const safeLink = escapeHtml(resetLink);
	const text = `We received a request to reset your Medicine Tracker password.

Use this link to choose a new password:
${resetLink}

This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.`;
	const html = buildEmailHtml({
		preheader: "Use the secure link to reset your Medicine Tracker password.",
		title: "Reset your password",
		intro: "We received a request to reset the password for your Medicine Tracker account. Use the button below to choose a new password.",
		contentHtml: `
			<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
				<tr><td align="center" bgcolor="#16a34a" style="border-radius:999px;">
					<a href="${safeLink}" style="display:inline-block;padding:13px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Reset password</a>
				</td></tr>
			</table>
			<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#57534e;">This link expires in <strong>1 hour</strong>.</p>
			<p style="margin:16px 0 6px;font-size:13px;line-height:1.6;color:#57534e;">If the button doesn't work, copy and paste this link into your browser:</p>
			<p style="margin:0;word-break:break-all;font-size:12px;line-height:1.6;color:#57534e;">${safeLink}</p>
			<p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#57534e;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>`,
	});

	await sendEmail({ to, subject: "Reset your password | Medicine Tracker", text, html });
}

export async function sendMedicationReminderEmail(to, { firstName, medName, time, date }) {
	const safeName = escapeHtml(medName);
	const greeting = firstName ? `Hi ${firstName},` : "Hello,";
	const text = `${greeting}

It's ${time} on ${date} — time for your ${medName}.

If you've already taken this medication, you can disregard this reminder.

— Medicine Tracker`;
	const html = buildEmailHtml({
		preheader: `Medication reminder: it's time for ${medName}.`,
		title: "Medication reminder",
		intro: `${escapeHtml(greeting)} It's time for your scheduled medication.`,
		contentHtml: `
			<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;background-color:#f5f5f4;border:1px solid #e7e5e4;border-radius:10px;">
				<tr><td style="padding:20px 22px;">
					<p style="margin:0 0 6px;color:#57534e;font-size:12px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;">Medication</p>
					<p style="margin:0;color:#1e293b;font-size:21px;line-height:1.4;font-weight:700;">${safeName}</p>
					<p style="margin:10px 0 0;color:#57534e;font-size:14px;line-height:1.6;">Scheduled for <strong>${escapeHtml(time)}</strong> on <strong>${escapeHtml(date)}</strong></p>
				</td></tr>
			</table>
			<p style="margin:0;font-size:14px;line-height:1.6;color:#57534e;">If you've already taken this medication, you can disregard this reminder.</p>`,
	});

	await sendEmail({
		to,
		subject: `Medication reminder: time to take ${medName}`,
		text,
		html,
	});
}
