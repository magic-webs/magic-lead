"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const password = formData.get("password") as string;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (expectedPassword && password === expectedPassword) {
    const cookieStore = await cookies();
    cookieStore.set("admin_auth", expectedPassword, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    
    // Redirect to home on success
    redirect("/");
  } else {
    return { error: "Invalid password." };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_auth");
  redirect("/login");
}
