import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth-admin";
import { getPlayerSession } from "@/lib/auth-player";
import { uploadToEffAssets } from "@/lib/supabase-storage";

export async function POST(req: Request) {
  try {
    // Authenticate: either Admin or Player session must be valid
    const [adminSession, playerSession] = await Promise.all([
      getAdminSession(req),
      getPlayerSession(req),
    ]);

    if (!adminSession && !playerSession) {
      return NextResponse.json(
        { error: "Unauthorized. Authentication required to upload assets." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Sanitize extension and generate unique filename
    const originalName = file.name || "upload.png";
    const extension = originalName.split(".").pop()?.toLowerCase() || "png";
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const sanitizedFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "");
    const destinationPath = `${sanitizedFolder}/${timestamp}-${randomStr}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadToEffAssets(buffer, destinationPath, file.type);

    return NextResponse.json({
      success: true,
      url: result.url,
      path: result.path,
    });
  } catch (error: unknown) {
    console.error("POST /api/upload error:", error);
    const message = error instanceof Error ? error.message : "Failed to upload asset.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
