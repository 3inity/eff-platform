export const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "jhvycfwtjtqcqvzshzzi";
export const SUPABASE_STORAGE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public/eff-assets`;

export const BRANDING = {
  LOGO: `${SUPABASE_STORAGE_URL}/branding/eff-logo.svg`,
  DEFAULT_BANNER: `${SUPABASE_STORAGE_URL}/branding/competition-banner.svg`,
  DEFAULT_CREST: `${SUPABASE_STORAGE_URL}/branding/default-crest.svg`,
};

export const AUTH_COOKIES = {
  ADMIN: "admin_session",
  PLAYER: "player_session",
};

export const PASSWORD_MIN_LENGTH = 8;
