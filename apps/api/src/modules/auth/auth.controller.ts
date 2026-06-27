import type { Request, Response } from "express";
import { prisma } from "@nuru/db";
import { generateOpaqueToken } from "@nuru/auth/crypto";
import type {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
  VerifyEmailInput,
} from "@nuru/types";
import { sendOk } from "../../lib/response.js";
import { Errors } from "../../lib/errors.js";
import { env, googleOAuthConfigured } from "../../env.js";
import * as authService from "./auth.service.js";
import { clearSession, issueSession, rotateSession } from "./session.js";
import { getGoogleAuthUrl, handleGoogleCallback } from "./google.js";

const OAUTH_STATE_COOKIE = "nuru_oauth_state";

export async function signup(req: Request, res: Response): Promise<void> {
  const user = await authService.signup(req.body as SignupInput);
  await issueSession(res, req, { id: user.id, email: user.email });
  sendOk(res, { user: authService.toAuthUser(user) }, 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginInput;
  const user = await authService.login(email, password);
  await issueSession(res, req, { id: user.id, email: user.email });
  sendOk(res, { user: authService.toAuthUser(user) });
}

export async function logout(req: Request, res: Response): Promise<void> {
  await clearSession(res, req);
  sendOk(res, { success: true });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  await rotateSession(res, req);
  sendOk(res, { success: true });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw Errors.unauthorized();
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) throw Errors.unauthorized();
  sendOk(res, { user: authService.toAuthUser(user) });
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { token } = req.body as VerifyEmailInput;
  await authService.verifyEmail(token);
  sendOk(res, { success: true });
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as ForgotPasswordInput;
  await authService.requestPasswordReset(email);
  sendOk(res, { success: true });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body as ResetPasswordInput;
  await authService.resetPassword(token, password);
  sendOk(res, { success: true });
}

// ---- Google OAuth ----

export function googleStart(_req: Request, res: Response): void {
  if (!googleOAuthConfigured) throw Errors.badRequest("Google sign-in is not configured.");
  const state = generateOpaqueToken(16);
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
    path: "/",
  });
  res.redirect(getGoogleAuthUrl(state));
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  if (!googleOAuthConfigured) throw Errors.badRequest("Google sign-in is not configured.");

  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;
  const cookieState = (req.cookies as Record<string, string> | undefined)?.[OAUTH_STATE_COOKIE];

  res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });

  if (!code || !state || !cookieState || state !== cookieState) {
    res.redirect(`${env.WEB_APP_URL}/auth/login?error=oauth_state`);
    return;
  }

  try {
    const user = await handleGoogleCallback(code);
    await issueSession(res, req, { id: user.id, email: user.email });
    res.redirect(`${env.WEB_APP_URL}/profile`);
  } catch {
    res.redirect(`${env.WEB_APP_URL}/auth/login?error=oauth_failed`);
  }
}
