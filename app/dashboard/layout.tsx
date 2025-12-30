"use client"

import { SessionProvider } from "next-auth/react"
import { Sidebar } from "@/components/layouts/Sidebar"
import { TopNav } from "@/components/layouts/TopNav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  )
}
