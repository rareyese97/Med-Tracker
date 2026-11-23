import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendOtpEmail(to, code, options = {}) {
	const msg = {
		to,
		from: process.env.FROM_EMAIL,
		subject: options.subject || "Verify your email | Medicine Tracker",
		text:
			options.text ||
			`Welcome to Medicine Tracker!

Use the verification code below to confirm your email address:

${code}

This code expires in 10 minutes. For your security, do not share it with anyone.

If you did not create a Medicine Tracker account, you can safely ignore this email.`,
		html:
			options.html ||
			`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
	<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Medicine Tracker verification code is inside.</div>
	<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f6fb;padding:32px 12px;">
		<tr>
			<td align="center">
				<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
					<tr>
						<td style="padding:28px 32px;background-color:#2563eb;color:#ffffff;">
							<p style="margin:0;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Medicine Tracker</p>
							<h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;font-weight:700;">Verify your email address</h1>
						</td>
					</tr>
					<tr>
						<td style="padding:32px;">
							<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Thanks for creating a Medicine Tracker account. Enter this verification code in the app to confirm your email address:</p>
							<div style="margin:24px 0;padding:18px 12px;background-color:#f3f6ff;border:1px solid #dbe5ff;border-radius:10px;text-align:center;">
								<p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Your verification code</p>
								<p style="margin:0;color:#1d4ed8;font-size:34px;line-height:1.3;font-weight:700;letter-spacing:9px;">${code}</p>
							</div>
							<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">This code expires in <strong>10 minutes</strong>. For your security, never share it with anyone.</p>
							<p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#64748b;">If you didn't create a Medicine Tracker account, you can safely ignore this email.</p>
						</td>
					</tr>
					<tr>
						<td style="padding:18px 32px;background-color:#f8fafc;border-top:1px solid #e5e7eb;">
							<p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">This is an automated message from Medicine Tracker. Please do not reply to this email.</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`,
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
