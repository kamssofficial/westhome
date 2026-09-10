"use server";

import { signIn } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;
  const callbackUrl = (formData.get("callbackUrl") as string) || "/account";

  await signIn("credentials", {
    phone,
    password,
    redirectTo: callbackUrl,
  });
}