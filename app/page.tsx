import { redirect } from "next/navigation"

export default function Home() {
  // Redirect root to main website
  redirect("https://othertales.co")
}
