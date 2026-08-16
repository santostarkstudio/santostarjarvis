import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const sourcePath =
    "C:\\Users\\santo\\.gemini\\antigravity-ide\\brain\\0a0289ca-5538-438a-9348-15df38ffaf5b\\.user_uploaded\\media_1786814598517.jpg";

  try {
    if (fs.existsSync(sourcePath)) {
      const buffer = fs.readFileSync(sourcePath);

      // Auto-cache to public directory as well
      try {
        const pubDir = path.join(process.cwd(), "public");
        if (!fs.existsSync(pubDir)) {
          fs.mkdirSync(pubDir, { recursive: true });
        }
        fs.writeFileSync(path.join(pubDir, "ironman_startup.jpg"), buffer);
      } catch (copyErr) {
        console.warn("[StartupImage] Copy to public skipped:", copyErr);
      }

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  } catch (err) {
    console.error("[StartupImage] Failed to read source image:", err);
  }

  return new NextResponse("Image not found", { status: 404 });
}
