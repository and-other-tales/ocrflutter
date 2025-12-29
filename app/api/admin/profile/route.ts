import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
})

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    // Check if email is already taken by another user
    const existingUser = await prisma.admin.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is already in use",
          code: "EMAIL_IN_USE",
        },
        { status: 400 }
      )
    }

    // Update the admin profile
    const updatedAdmin = await prisma.admin.update({
      where: { id: session.user.id },
      data: {
        name: validatedData.name,
        email: validatedData.email,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        admin: {
          id: updatedAdmin.id,
          name: updatedAdmin.name,
          email: updatedAdmin.email,
          role: updatedAdmin.role,
        },
      },
      message: "Profile updated successfully",
    })
  } catch (error: any) {
    console.error("PUT /api/admin/profile error:", error)

    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update profile",
      },
      { status: 500 }
    )
  }
}
