import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin, isSameOrigin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif", "image/x-icon", "image/vnd.microsoft.icon"];
const DOWNLOAD_MAX = 2 * 1024 * 1024 * 1024; // 2 GB per file
const LOGO_MAX = 2 * 1024 * 1024; // 2 MB

/**
 * Issues short-lived upload permissions so the owner's browser can send a file straight to Vercel Blob.
 * Owner only. Logos are restricted to images; downloads accept any file type.
 */
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });

  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        let kind = "download";
        try {
          if (clientPayload) kind = JSON.parse(clientPayload).kind === "logo" ? "logo" : "download";
        } catch {
          /* default to download */
        }
        if (kind === "logo") return { allowedContentTypes: IMAGE_TYPES, maximumSizeInBytes: LOGO_MAX, addRandomSuffix: true };
        return { maximumSizeInBytes: DOWNLOAD_MAX, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {
        // The browser saves the file record through the admin API after the upload finishes.
      },
    });
    return Response.json(json);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
