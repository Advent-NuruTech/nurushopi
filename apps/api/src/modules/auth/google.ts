import { prisma, type User } from "@nuru/db";
import { generateCode } from "@nuru/auth/crypto";
import { env } from "../../env.js";
import { Errors } from "../../lib/errors.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

interface GoogleProfile {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/** Builds the Google consent URL. `state` is an opaque CSRF token. */
export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    throw Errors.badRequest("Failed to exchange Google authorization code.");
  }
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) throw Errors.badRequest("Google did not return an access token.");

  const profileRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileRes.ok) throw Errors.badRequest("Failed to fetch Google profile.");

  const profile = (await profileRes.json()) as GoogleProfile;
  if (!profile.email) throw Errors.badRequest("Google account has no email.");
  return profile;
}

/** Exchanges the code, then finds-or-creates the linked user. */
export async function handleGoogleCallback(code: string): Promise<User> {
  const profile = await exchangeCodeForProfile(code);
  const email = profile.email.toLowerCase();

  // Already linked?
  const linked = await prisma.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider: "google", providerAccountId: profile.sub } },
    include: { user: true },
  });
  if (linked) return linked.user;

  // Existing user by email → link Google to it.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.oAuthAccount.create({
      data: { userId: existing.id, provider: "google", providerAccountId: profile.sub },
    });
    if (!existing.emailVerified && profile.email_verified) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { emailVerified: new Date() },
      });
    }
    return existing;
  }

  // New user.
  return prisma.user.create({
    data: {
      email,
      name: profile.name ?? null,
      avatarUrl: profile.picture ?? null,
      emailVerified: profile.email_verified ? new Date() : null,
      referralCode: generateCode(8),
      oauthAccounts: {
        create: { provider: "google", providerAccountId: profile.sub },
      },
    },
  });
}
