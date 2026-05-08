// web/app/page.tsx
// Root of the admin web app — there's no public landing page; the only
// thing that lives here is the admin console. Redirect everything to
// /admin (which itself either renders the dashboard or bounces to
// /admin/login depending on the session).

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/admin");
}
