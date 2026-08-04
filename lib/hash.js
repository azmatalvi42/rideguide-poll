/**
 * One way hash of the client IP, salted with a server secret.
 * Lets us throttle floods without ever storing an address.
 */
export async function hashIp(ip) {
  const salt = process.env.IP_SALT || "rideguide-dev-salt";
  const bytes = new TextEncoder().encode(salt + "|" + (ip || "unknown"));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export function clientIp(req) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
