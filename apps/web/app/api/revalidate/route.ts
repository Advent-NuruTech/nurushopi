import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

/**
 * On-demand cache revalidation webhook.
 *
 * The storefront serves catalog data from Next's Data Cache (see
 * `lib/server/cache-tags.ts`). When an admin/API write changes catalog data it
 * calls this endpoint to purge the affected tags instantly, instead of waiting
 * for time-based revalidation.
 *
 *   POST /api/revalidate
 *   Header: x-revalidate-secret: <REVALIDATE_SECRET>
 *   Body:   { "tags": ["products", "product:abc"], "paths": ["/shop"] }
 *
 * Secured by a shared secret so only trusted services can purge the cache.
 */

export const runtime = "nodejs";

interface RevalidateBody {
  tags?: unknown;
  paths?: unknown;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Revalidation is not configured." },
      { status: 500 },
    );
  }

  const provided = req.headers.get("x-revalidate-secret");
  if (provided !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: RevalidateBody;
  try {
    body = (await req.json()) as RevalidateBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const tags = asStringArray(body.tags);
  const paths = asStringArray(body.paths);

  if (tags.length === 0 && paths.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Provide at least one tag or path to revalidate." },
      { status: 400 },
    );
  }

  for (const tag of tags) revalidateTag(tag);
  for (const path of paths) revalidatePath(path);

  return NextResponse.json({
    ok: true,
    revalidated: { tags, paths },
    now: Date.now(),
  });
}
