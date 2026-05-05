import { SignInButton, Show, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="rounded-md bg-black px-4 py-2 text-white">
            Sign in
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </main>
  );
}