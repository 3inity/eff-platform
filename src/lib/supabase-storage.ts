import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jhvycfwtjtqcqvzshzzi.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadToEffAssets(
  fileData: Buffer | Uint8Array | Blob,
  destinationPath: string,
  contentType?: string
): Promise<{ url: string; path: string }> {
  const { data, error } = await supabase.storage
    .from("eff-assets")
    .upload(destinationPath, fileData, {
      contentType: contentType || "image/png",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload to eff-assets: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from("eff-assets")
    .getPublicUrl(destinationPath);

  return {
    url: publicUrlData.publicUrl,
    path: destinationPath,
  };
}
