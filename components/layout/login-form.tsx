"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  loginAction,
  forgotPasswordAction,
} from "@/lib/actions/auth";
import {
  loginSchema,
  forgotPasswordSchema,
  type LoginFormValues,
} from "@/lib/validators/auth";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loginAction(values);
      if (result && !result.success) {
        setError(result.error ?? "Error al iniciar sesión");
        setIsLoading(false);
      }
    } catch {
      // redirect() lanza una excepción en Next.js — es comportamiento esperado
    }
  };

  const onResetPassword = async () => {
    setResetLoading(true);
    setResetError(null);
    setResetSuccess(false);

    const parsed = forgotPasswordSchema.safeParse({ email: resetEmail });
    if (!parsed.success) {
      setResetError(parsed.error.issues[0]?.message ?? "Correo inválido");
      setResetLoading(false);
      return;
    }

    const result = await forgotPasswordAction({ email: resetEmail });
    setResetLoading(false);

    if (result.success) {
      setResetSuccess(true);
    } else {
      setResetError(result.error ?? "Error al enviar el correo");
    }
  };

  return (
    <>
      <Card className="w-full max-w-lg border-0 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-20 items-center rounded-2xl bg-white px-4 shadow-sm">
            <Image
              src="/logo-icredix.png"
              alt="iCredix"
              width={1274}
              height={832}
              className="h-14 w-auto object-contain"
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold">iCredix CRM</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Usuario</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario"
                autoComplete="email"
                disabled={isLoading}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoading}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-[#0046DB]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Dialog open={resetOpen} onOpenChange={setResetOpen}>
              <DialogTrigger
                render={
                  <button
                    type="button"
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  />
                }
              >
                ¿Olvidaste tu contraseña?
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Restablecer contraseña</DialogTitle>
                  <DialogDescription>
                    Ingresa tu correo y te enviaremos un enlace para crear una
                    nueva contraseña.
                  </DialogDescription>
                </DialogHeader>
                {resetSuccess ? (
                  <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                    Correo enviado. Revisa tu bandeja de entrada.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input
                      type="email"
                      placeholder="usuario@icredix.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      disabled={resetLoading}
                    />
                    {resetError && (
                      <p className="text-sm text-destructive">{resetError}</p>
                    )}
                    <Button
                      className="w-full bg-primary hover:bg-[#0046DB]"
                      disabled={resetLoading || !resetEmail}
                      onClick={onResetPassword}
                    >
                      {resetLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        "Enviar enlace"
                      )}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
