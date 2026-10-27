export const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "eff-ultra-secure-jwt-session-secret-key-32-chars-long"
);

export const SUPER_ADMIN_CONFIG = {
  username: process.env.SUPER_ADMIN_USERNAME || "admin",
  passcode: process.env.SUPER_ADMIN_PASSCODE || "admin123456",
};
