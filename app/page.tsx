import { redirect } from "next/navigation"

export default function Home() {
  // Redirect root to dashboard (or main website in production)
  const redirectUrl = process.env.NODE_ENV === "production" && process.env.EXTERNAL_REDIRECT_URL 
    ? process.env.EXTERNAL_REDIRECT_URL 
    : "/dashboard"
  
  redirect(redirectUrl)
}
