"use client";

import { useEffect, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const name = user.fullName ?? user.firstName ?? email;
  const initials =
    (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "") ||
    email[0]?.toUpperCase() ||
    "?";

  const handleSignOut = async () => {
    setOpen(false);
    await signOut(() => router.push("/"));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--hairline)",
          color: "var(--text)",
        }}
      >
        {user.hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[12px] font-medium">{initials}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-lg shadow-2xl overflow-hidden text-[13px]"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--hairline)",
          }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--hairline)" }}>
            <div className="font-medium truncate" style={{ color: "var(--text)" }}>
              {name}
            </div>
            {email && (
              <div className="mt-0.5 truncate" style={{ color: "var(--text-3)" }}>
                {email}
              </div>
            )}
          </div>
          <div className="py-1">
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 hover:bg-white/[0.03]"
              style={{ color: "var(--text-2)" }}
            >
              Manage account
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="block w-full text-left px-4 py-2 hover:bg-white/[0.03]"
              style={{ color: "var(--text-2)" }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
