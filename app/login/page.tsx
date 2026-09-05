"use client";

import { useActionState } from "react";
import Image from "next/image";
import { loginAction } from "./actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import logoMark from "@/public/images/logo-mark.png";

export default function LoginPage() {
  // On success loginAction redirects, so it only ever returns an error.
  const [state, formAction, isPending] = useActionState<
    { error: string } | null,
    FormData
  >(async (_prevState, formData) => {
    return (await loginAction(formData)) ?? null;
  }, null);

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-foreground">
            <Image
              src={logoMark}
              alt="Magic Lead"
              priority
              className="size-10 object-contain"
            />
          </div>
          <div className="text-center">
            <p className="font-heading text-lg font-semibold">Magic Lead</p>
            <p className="text-sm text-muted-foreground">Lead routing</p>
          </div>
        </div>

        <Card className="w-full">
          <form action={formAction}>
            <CardHeader>
              <CardTitle className="text-xl">Admin login</CardTitle>
              <CardDescription>
                Enter the admin password to access the workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoFocus
                  autoComplete="current-password"
                />
                {state?.error && (
                  <p className="mt-1 text-sm font-medium text-destructive">
                    {state.error}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" type="submit" disabled={isPending}>
                {isPending ? "Signing in…" : "Sign in"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
