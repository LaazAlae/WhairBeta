import Link from "next/link"
import Image from "next/image"
import {
  Search,
  ShieldCheck,
  Gavel,
  DollarSign,
  ArrowRight,
  UserCheck,
  Scale,
  Award,
} from "lucide-react"

const pillars = [
  {
    icon: Search,
    title: "Detection",
    description:
      "AI-powered scanning detects unauthorized uses of your likeness across the web, social media, and AI-generated content.",
    color: "bg-blue-500",
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    icon: ShieldCheck,
    title: "Verification",
    description:
      "Cryptographic provenance and C2PA content credentials prove ownership and authenticity of your digital identity.",
    color: "bg-emerald-500",
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-50",
  },
  {
    icon: Gavel,
    title: "Enforcement",
    description:
      "Automated evidence collection and streamlined takedown workflows help you act fast against unauthorized use.",
    color: "bg-purple-500",
    iconColor: "text-purple-500",
    bgColor: "bg-purple-50",
  },
  {
    icon: DollarSign,
    title: "Monetization",
    description:
      "License detected uses of your likeness on your terms. Set your price, control your rights, and earn from authorized use.",
    color: "bg-amber-500",
    iconColor: "text-amber-500",
    bgColor: "bg-amber-50",
  },
]

const benefits = [
  {
    icon: UserCheck,
    title: "Creator-First",
    description:
      "Built for creators, by creators. Every feature is designed to put you in control of your digital likeness and how it is used.",
  },
  {
    icon: Scale,
    title: "Compliance Ready",
    description:
      "Stay ahead of evolving AI regulations with built-in compliance tools, audit trails, and industry-standard provenance records.",
  },
  {
    icon: Award,
    title: "Industry Standard",
    description:
      "Built on open standards including C2PA content credentials, ensuring interoperability and long-term trust in your digital identity.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.jpeg"
              alt="Whair"
              width={32}
              height={32}
              className="size-8 rounded-lg"
            />
            <span className="text-lg font-semibold text-white">Whair</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-950 transition-colors hover:bg-gray-100"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gray-950 pt-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-gray-950 to-gray-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 py-28 sm:px-6 sm:py-36 lg:py-44">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-gray-400">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Now in Beta
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Protect Your{" "}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Digital Likeness
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
              Detect, verify, enforce, and monetize your identity in the AI era.
              Take control of how your likeness is used across the internet.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="group inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 text-base font-medium text-gray-950 transition-all hover:bg-gray-100 hover:shadow-lg hover:shadow-white/10"
              >
                Get Started
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/15 px-6 text-base font-medium text-gray-300 transition-colors hover:border-white/25 hover:text-white"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* How It Works Section */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              How It Works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Four Pillars of Protection
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              A comprehensive platform that covers every aspect of digital
              likeness protection, from detection to monetization.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar, index) => (
              <div
                key={pillar.title}
                className="group relative rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-300 hover:shadow-lg"
              >
                {/* Step number */}
                <div className="absolute -top-3 left-6">
                  <span className={`inline-flex size-6 items-center justify-center rounded-full ${pillar.color} text-xs font-bold text-white`}>
                    {index + 1}
                  </span>
                </div>

                <div className={`mb-4 inline-flex rounded-xl ${pillar.bgColor} p-3`}>
                  <pillar.icon className={`size-6 ${pillar.iconColor}`} />
                </div>

                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {pillar.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Whair Section */}
      <section className="border-t border-gray-100 bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-purple-600">
              Why Whair
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Built for the AI Era
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              As AI makes it easier than ever to replicate and misuse digital
              identities, Whair gives creators the tools to fight back.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
                  <benefit.icon className="size-7 text-gray-700" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {benefit.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-950 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to protect your likeness?
            </h2>
            <p className="mt-4 text-lg text-gray-400">
              Join creators who are taking control of their digital identity.
              Set up your account in minutes.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="group inline-flex h-12 items-center gap-2 rounded-lg bg-white px-8 text-base font-medium text-gray-950 transition-all hover:bg-gray-100"
              >
                Create Your Account
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.jpeg"
                alt="Whair"
                width={28}
                height={28}
                className="size-7 rounded-md"
              />
              <span className="text-sm font-medium text-gray-900">Whair</span>
            </div>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Whair. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
