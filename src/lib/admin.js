const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const adminUserIds = (import.meta.env.VITE_ADMIN_USER_IDS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export function isAdminUser(user) {
  if (!user) {
    return false;
  }

  const primaryEmail = user.primaryEmailAddress?.emailAddress?.toLowerCase() || "";

  return adminUserIds.includes(user.id) || adminEmails.includes(primaryEmail);
}

export function hasAdminGuardConfigured() {
  return adminEmails.length > 0 || adminUserIds.length > 0;
}
