"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "sign-in" | "sign-up";
type OAuthStrategy = "oauth_google" | "oauth_apple" | "oauth_github";

export function Auth3({ mode = "sign-in" }: { mode?: Mode }) {
  const router = useRouter();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const isSignUp = mode === "sign-up";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const goToDashboard = () => router.push("/dashboard");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isSignUp) {
        const create = await signUp.password({ emailAddress: email, password });
        if (create.error) {
          setError(create.error.message ?? "Sign-up failed");
          return;
        }
        const send = await signUp.verifications.sendEmailCode();
        if (send.error) {
          setError(send.error.message ?? "Could not send verification email");
          return;
        }
        setPendingVerification(true);
      } else {
        const res = await signIn.password({ identifier: email, password });
        if (res.error) {
          setError(res.error.message ?? "Invalid email or password");
          return;
        }
        if (signIn.status === "complete") {
          await signIn.finalize({ navigate: goToDashboard });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await signUp.verifications.verifyEmailCode({ code });
      if (res.error) {
        setError(res.error.message ?? "Invalid code");
        return;
      }
      if (signUp.status === "complete") {
        await signUp.finalize({ navigate: goToDashboard });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuth = async (strategy: OAuthStrategy) => {
    setError(null);
    const redirectUrl = `${window.location.origin}/sign-in/sso-callback`;
    const redirectCallbackUrl = `${window.location.origin}/dashboard`;
    const res = isSignUp
      ? await signUp.sso({ strategy, redirectUrl, redirectCallbackUrl })
      : await signIn.sso({ strategy, redirectUrl, redirectCallbackUrl });
    if (res.error) setError(res.error.message ?? "OAuth failed");
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-6">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1709562493281-03c47edcb046?q=80&w=822&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-center gap-12">
        {/* Left Side - Sign In Card */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl p-8 shadow-2xl"
        >
          {pendingVerification ? (
            <>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                Check your email
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8">
                We sent a verification code to <span className="font-medium">{email}</span>.
              </p>

              <form onSubmit={handleVerify} className="mb-6">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Verification code"
                  required
                  className="w-full px-4 py-3 mb-4 rounded-lg border-2 border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-600 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition-all duration-200"
                />
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors duration-200 disabled:opacity-60"
                >
                  {submitting ? "Verifying…" : "Verify"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setPendingVerification(false);
                  setCode("");
                  setError(null);
                }}
                className="w-full text-sm text-neutral-900 dark:text-white hover:text-neutral-700 dark:hover:text-neutral-300 font-medium"
              >
                Use a different email
              </button>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                {isSignUp ? "Create your account" : "Sign in"}
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8">
                {isSignUp ? "Already have an account? " : "New user? "}
                <Link
                  href={isSignUp ? "/sign-in" : "/sign-up"}
                  className="text-neutral-900 dark:text-white hover:text-neutral-700 dark:hover:text-neutral-300 font-medium no-underline"
                >
                  {isSignUp ? "Sign in" : "Create an account"}
                </Link>
              </p>

              <form onSubmit={handleSubmit} className="mb-6">
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="w-full px-4 py-3 mb-3 rounded-lg border-2 border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-600 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition-all duration-200"
                />
                <input
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={isSignUp ? 8 : undefined}
                  className="w-full px-4 py-3 mb-4 rounded-lg border-2 border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-600 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition-all duration-200"
                />
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors duration-200 disabled:opacity-60"
                >
                  {submitting ? "Continuing…" : "Continue"}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                <span className="text-sm text-neutral-500 dark:text-neutral-500">Or</span>
                <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
              </div>

              {/* OAuth Buttons */}
              <div className="space-y-3 mb-4">
                <button
                  type="button"
                  onClick={() => handleOAuth("oauth_google")}
                  className="w-full tracking-tight px-6 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors duration-200 flex items-center justify-center gap-3 text-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  {isSignUp ? "Sign up with Google" : "Sign in with Google"}
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuth("oauth_apple")}
                  className="w-full tracking-tight px-6 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors duration-200 flex items-center justify-center gap-3 text-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 814 1000" fill="currentColor">
                    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
                  </svg>
                  {isSignUp ? "Sign up with Apple" : "Sign in with Apple"}
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuth("oauth_github")}
                  className="w-full tracking-tight px-6 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors duration-200 flex items-center justify-center gap-3 text-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  {isSignUp ? "Sign up with GitHub" : "Sign in with GitHub"}
                </button>
              </div>

              <p className="text-sm text-center text-neutral-600 dark:text-neutral-400 mt-6">
                Can&apos;t sign in?{" "}
                <a
                  href="#"
                  className="text-neutral-900 dark:text-white hover:text-neutral-700 dark:hover:text-neutral-300 font-medium no-underline"
                >
                  Get help
                </a>
              </p>
            </>
          )}
        </motion.div>

        {/* Right Side - Brand Text */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="hidden lg:block max-w-sm"
        >
          <h2 className="text-4xl font-medium tracking-tighter text-white mb-4">
            Witto
          </h2>
          <p className="text-lg text-white/90 tracking-tight max-w-[25ch]">
            A private dashboard for the projects you ship.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default Auth3;
