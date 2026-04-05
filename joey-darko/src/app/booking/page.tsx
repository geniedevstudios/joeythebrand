import { redirect } from "next/navigation";

/** Legacy URL: open the consultation drawer on the home page instead of a separate screen. */
export default function BookingRedirectPage() {
  redirect("/?consult=1");
}
