"use server";

import { redirect } from "next/navigation";
import { validateLogin, createSession, destroySession } from "@/lib/auth";

export async function loginAction(formData: FormData): Promise<void> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!validateLogin(username, password)) {
    redirect("/login?error=1");
  }

  await createSession();
  redirect("/admin/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
