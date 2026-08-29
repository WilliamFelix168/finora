import { redirect } from "next/navigation";

/** Reached only when authenticated — proxy.ts sends anonymous visitors to /login. */
export default function RootPage() {
  redirect("/dashboard");
}
