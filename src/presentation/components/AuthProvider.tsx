"use client";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  // Bypass auth checks for UI testing with dummy data
  return <>{children}</>;
}
