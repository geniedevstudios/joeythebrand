/** Only this account may add/remove dashboard admins in the UI. */
export const PRIMARY_ADMIN_EMAIL = "joeythebrandonline@gmail.com";

export function isPrimaryAdminEmail(email: string | null | undefined): boolean {
  return String(email ?? "")
    .trim()
    .toLowerCase() === PRIMARY_ADMIN_EMAIL;
}
