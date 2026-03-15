import Link from "next/link"
import Image from "next/image"

export const dynamic = "force-dynamic"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Link href="/" className="mb-2 flex flex-col items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt="Whair"
              width={48}
              height={48}
              className="size-12 rounded-xl"
              priority
            />
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Whair
            </h1>
          </Link>
          <p className="text-sm text-gray-400">
            Protect your digital likeness
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
