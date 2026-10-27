import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function uploadAsset(localPath, remotePath) {
  const content = readFileSync(localPath);
  console.log(`Uploading ${localPath} to eff-assets/${remotePath}...`);
  const { data, error } = await supabase.storage
    .from("eff-assets")
    .upload(remotePath, content, {
      contentType: "image/svg+xml",
      upsert: true,
    });

  if (error) {
    console.error(`Error uploading ${remotePath}:`, error.message);
  } else {
    console.log(`Uploaded successfully: ${remotePath}`);
  }
}

async function main() {
  await uploadAsset("src/assets/branding/eff-logo.svg", "branding/eff-logo.svg");
  await uploadAsset("src/assets/branding/competition-banner.svg", "branding/competition-banner.svg");
  await uploadAsset("src/assets/branding/default-crest.svg", "branding/default-crest.svg");
}

main().catch(console.error);
