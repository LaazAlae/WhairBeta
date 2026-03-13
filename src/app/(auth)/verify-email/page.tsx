import Link from "next/link"
import { Mail } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function VerifyEmailPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="size-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Check your email</CardTitle>
        <CardDescription>
          We&apos;ve sent you a verification link. Click it to activate your
          account.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t receive the email? Check your spam folder or try signing
          up again.
        </p>
        <Button
          variant="outline"
          className="w-full"
          render={<Link href="/login" />}
        >
          Back to Sign In
        </Button>
      </CardContent>
    </Card>
  )
}
