import { createHash } from "node:crypto";

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function cloudinaryPublicIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("res.cloudinary.com")) return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex < 0) return null;
    const assetParts = parts.slice(uploadIndex + 1).filter((part) => !/^v\d+$/.test(part));
    const assetPath = assetParts.join("/");
    if (!assetPath) return null;
    return assetPath.replace(/\.[a-z0-9]+$/i, "");
  } catch {
    return null;
  }
}

export async function deleteCloudinaryImages(urls: string[]): Promise<void> {
  const config = cloudinaryConfig();
  if (!config) return;

  const publicIds = [...new Set(urls.map(cloudinaryPublicIdFromUrl).filter(Boolean))] as string[];
  if (publicIds.length === 0) return;

  await Promise.all(
    publicIds.map(async (publicId) => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createHash("sha1")
        .update(`public_id=${publicId}&timestamp=${timestamp}${config.apiSecret}`)
        .digest("hex");
      const body = new URLSearchParams({
        public_id: publicId,
        api_key: config.apiKey,
        timestamp: String(timestamp),
        signature,
      });

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`,
        { method: "POST", body },
      );
      if (!res.ok) {
        console.error(`Cloudinary delete failed for ${publicId}: ${res.status}`);
      }
    }),
  );
}
