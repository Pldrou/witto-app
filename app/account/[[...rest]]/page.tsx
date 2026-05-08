"use client";

import { UserProfile } from "@clerk/nextjs";

export default function AccountPage() {
  return (
    <main className="px-8 py-12">
      <div className="mx-auto" style={{ maxWidth: 1080 }}>
        <UserProfile path="/account" routing="path" />
      </div>
    </main>
  );
}
