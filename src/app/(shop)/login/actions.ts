"use server";

import { signIn } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const callbackUrl = (formData.get("callbackUrl") as string) || "/admin/dashboard";

  await signIn("credentials", {
    email,
    password,
    redirectTo: callbackUrl,
  });
}
