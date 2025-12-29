import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import { verifyPassword } from "./password"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined

        if (!email || !password) {
          throw new Error("Email and password are required")
        }

        const admin = await prisma.admin.findUnique({
          where: { email },
        })

        if (!admin) {
          throw new Error("Invalid email or password")
        }

        const isPasswordValid = await verifyPassword(
          password,
          admin.password
        )

        if (!isPasswordValid) {
          throw new Error("Invalid email or password")
        }

        // Update last login
        await prisma.admin.update({
          where: { id: admin.id },
          data: { lastLogin: new Date() },
        })

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id
        session.user.email = token.email
        session.user.name = token.name
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: "/admin",
    error: "/admin",
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
})
