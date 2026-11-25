type SecurityEvent =
  | "admin_login_rejected"
  | "admin_session_created"
  | "admin_session_cleared"
  | "publication_write_failed";

export function recordSecurityEvent(event: SecurityEvent) {
  console.info(JSON.stringify({ component: "ipos.security", event }));
}
