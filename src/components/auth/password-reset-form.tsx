"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Loader2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordValues,
  type ResetPasswordValues,
} from "@/lib/validations/auth"

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface PasswordResetFormProps {
  mode: "request" | "reset"
}

export function PasswordResetForm({ mode }: PasswordResetFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({})

  async function onRequestSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    const values = {
      email: formData.get("email") as string,
    }

    const result = forgotPasswordSchema.safeParse(values)

    if (!result.success) {
      const errors: Partial<Record<keyof ForgotPasswordValues, string>> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ForgotPasswordValues
        if (!errors[field]) {
          errors[field] = issue.message
        }
      }
      setFieldErrors(errors)
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        result.data.email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      )

      if (error) {
        toast.error(error.message)
        return
      }

      setEmailSent(true)
      toast.success("Check your email for a password reset link")
    } catch {
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function onResetSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    const values = {
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    }

    const result = resetPasswordSchema.safeParse(values)

    if (!result.success) {
      const errors: Partial<Record<keyof ResetPasswordValues, string>> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ResetPasswordValues
        if (!errors[field]) {
          errors[field] = issue.message
        }
      }
      setFieldErrors(errors)
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: result.data.password,
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success("Password updated successfully")
      router.push("/dashboard")
    } catch {
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (mode === "request" && emailSent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          We&apos;ve sent a password reset link to your email address. Please
          check your inbox and click the link to reset your password.
        </p>
        <Button
          variant="outline"
          className="w-full"
          render={<Link href="/login" />}
        >
          <ArrowLeft className="size-4" />
          Back to Sign In
        </Button>
      </div>
    )
  }

  if (mode === "request") {
    return (
      <form onSubmit={onRequestSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={loading}
            aria-invalid={!!fieldErrors.email}
          />
          {fieldErrors.email && (
            <p className="text-sm text-destructive">{fieldErrors.email}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          Send Reset Link
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    )
  }

  return (
    <form onSubmit={onResetSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your new password"
          autoComplete="new-password"
          disabled={loading}
          aria-invalid={!!fieldErrors.password}
        />
        {fieldErrors.password && (
          <p className="text-sm text-destructive">{fieldErrors.password}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Must be at least 8 characters with uppercase, lowercase, and a number.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Confirm your new password"
          autoComplete="new-password"
          disabled={loading}
          aria-invalid={!!fieldErrors.confirmPassword}
        />
        {fieldErrors.confirmPassword && (
          <p className="text-sm text-destructive">
            {fieldErrors.confirmPassword}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="animate-spin" />}
        Update Password
      </Button>
    </form>
  )
}
