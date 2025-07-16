// src/app/services/auth.ts
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001") + "/api/auth";

async function request(path: string, options: RequestInit = {}) {
	const res = await fetch(`${API_BASE}${path}`, {
		headers: { "Content-Type": "application/json" },
		credentials: "include", 
		...options,
	});
	const payload = await res.json();
	if (!res.ok) throw new Error(payload.message || res.statusText);
	return payload;
}

export function register(firstName: string, email: string, password: string) {
	return request("/register", {
		method: "POST",
		body: JSON.stringify({ firstName, email, password }),
	});
}

export function login(email: string, password: string) {
	return request("/login", {
		method: "POST",
		body: JSON.stringify({ email, password }),
	});
}

export function sendCode(email: string) {
	return request("/send-code", {
		method: "POST",
		body: JSON.stringify({ email }),
	});
}

export function verifyCode(email: string, code: string) {
	return request("/verify-code", {
		method: "POST",
		body: JSON.stringify({ email, code }),
	});
}

export function forgotPassword(email: string) {
	return request("/forgot-password", {
		method: "POST",
		body: JSON.stringify({ email }),
	});
}

export function requestPasswordReset(email: string) {
  return request("/request-password-reset", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(
  email: string,
  token: string,
  newPassword: string
) {
  return request("/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, token, newPassword }),
  });
}
