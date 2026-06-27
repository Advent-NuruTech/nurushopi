const FIREBASE_RESET_ENDPOINT =
  "https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode";

export async function sendAdminPasswordResetEmail(params: {
  email: string;
  continueUrl?: string;
}) {
  const apiKey =
    process.env.FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "";
  if (!apiKey) {
    console.warn("Missing Firebase API key for password reset.");
    return { ok: false };
  }

  const payload = {
    requestType: "PASSWORD_RESET",
    email: params.email,
    ...(params.continueUrl ? { continueUrl: params.continueUrl } : {}),
  };

  try {
    const res = await fetch(`${FIREBASE_RESET_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      console.warn("Admin password reset request failed:", errorBody);
      return { ok: false };
    }

    return { ok: true };
  } catch (error) {
    console.warn("Admin password reset request error:", error);
    return { ok: false };
  }
}
