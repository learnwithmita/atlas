import { redirect } from "next/navigation";

// The main /practice page is now the generator; keep this path as an alias.
export default function BuildRedirect() {
  redirect("/practice");
}
