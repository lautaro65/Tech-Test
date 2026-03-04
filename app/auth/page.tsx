"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const isSignupMode = useMemo(
    () => searchParams.has("signup") && !searchParams.has("login"),
    [searchParams],
  );
  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") || "/mydashboards",
    [searchParams],
  );

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  useEffect(() => {
    if (searchParams.get("reason") === "invite") {
      toast("Iniciá sesión para aceptar la invitación al dashboard.", {
        icon: "🔗",
        duration: 5000,
        style: { fontSize: "13px", maxWidth: "360px" },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    form?: string;
  }>({});
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const isFormValid = isSignupMode
    ? name.trim().length > 0 &&
      email.trim().length > 0 &&
      password.trim().length >= 8
    : email.trim().length > 0 && password.trim().length > 0;

  const isTemporarilyBlocked =
    blockedUntil !== null && Date.now() < blockedUntil;
  const buttonDisabled = isLoading || !isFormValid || isTemporarilyBlocked;

  const buildAuthHref = (mode: "login" | "signup") => {
    const params = new URLSearchParams();
    if (mode === "signup") {
      params.set("signup", "");
    } else {
      params.set("login", "");
    }
    if (callbackUrl) {
      params.set("callbackUrl", callbackUrl);
    }
    return `/auth?${params.toString()}`;
  };

  const validateFields = () => {
    const nextErrors: {
      name?: string;
      email?: string;
      password?: string;
      form?: string;
    } = {};

    if (isSignupMode && !name.trim()) {
      nextErrors.name = "El nombre es obligatorio.";
    }
    if (!email.trim()) {
      nextErrors.email = "El email es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Ingresa un email válido.";
    }
    if (!password.trim()) {
      nextErrors.password = "La contraseña es obligatoria.";
    } else if (isSignupMode && password.trim().length < 8) {
      nextErrors.password = "La contraseña debe tener al menos 8 caracteres.";
    }

    setErrors(nextErrors);

    if (nextErrors.name) { nameRef.current?.focus(); return false; }
    if (nextErrors.email) { emailRef.current?.focus(); return false; }
    if (nextErrors.password) { passwordRef.current?.focus(); return false; }

    return true;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage("");
    setErrors({});

    if (isTemporarilyBlocked) {
      setErrors({ form: "Demasiados intentos. Espera unos minutos y vuelve a intentar." });
      return;
    }

    if (!validateFields()) return;

    setIsLoading(true);

    try {
      if (isSignupMode) {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
        });

        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };

        if (!response.ok) {
          setErrors({
            form: data.error || "No pudimos completar la operación. Revisa tus datos e inténtalo nuevamente.",
          });
          setIsLoading(false);
          return;
        }

        setSuccessMessage(data.message || "Cuenta creada correctamente.");
      }

      const loginResult = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (!loginResult || loginResult.error) {
        const nextFailedAttempts = failedAttempts + 1;
        setFailedAttempts(nextFailedAttempts);

        if (nextFailedAttempts >= 5) {
          setBlockedUntil(Date.now() + 5 * 60 * 1000);
          setErrors({ form: "Demasiados intentos. Espera unos minutos y vuelve a intentar." });
        } else {
          const attemptsLeft = 5 - nextFailedAttempts;
          setErrors({
            form: attemptsLeft > 0
              ? `Email o contraseña incorrectos. Te quedan ${attemptsLeft} intento${attemptsLeft === 1 ? "" : "s"}.`
              : "Email o contraseña incorrectos.",
          });
        }

        setIsLoading(false);
        return;
      }

      setFailedAttempts(0);
      setBlockedUntil(null);
      router.push(loginResult.url || callbackUrl);
      router.refresh();
    } catch {
      setErrors({ form: "Ocurrió un error inesperado. Intenta nuevamente en unos instantes." });
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-[calc(100vh-64px)] items-center justify-center overflow-hidden bg-background px-6 py-10 md:px-10">
      <Toaster position="top-center" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,var(--color-primary)/0.14,transparent_38%),radial-gradient(circle_at_82%_85%,var(--color-accent)/0.18,transparent_36%)]" />
      <div className="pointer-events-none absolute bottom-14 left-[58%] hidden h-20 w-20 rotate-12 rounded-md bg-primary/10 lg:block" />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative lg:pl-3">
          <span className="inline-flex rounded-full border border-border/70 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            FANZ · Gestión de eventos
          </span>

          <h1 className="mt-6 max-w-xl text-6xl font-semibold leading-[0.92] tracking-tight text-foreground md:text-8xl">
            Diseña tu
            <span className="text-primary"> evento</span>
            <br />
            en un solo
            <br />
            lugar
          </h1>

          <p className="mt-7 max-w-md text-lg leading-relaxed text-muted-foreground">
            Crea, edita y guarda mapas de asientos, áreas y mesas. Todo tu flujo
            de planificación vive dentro del mismo dashboard.
          </p>

          <div className="mt-12 inline-flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
              ●
            </span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
              ◐
            </span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              +2k
            </span>
            <span className="ml-2">Usado por equipos de producción y venues</span>
          </div>
        </section>

        <section className="relative">
          <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full border border-primary/25" />
          <div className="mx-auto w-full max-w-[430px] rounded-3xl border border-border/70 bg-card p-7 shadow-2xl sm:p-8">
            <h2
              className="text-3xl font-semibold tracking-tight text-foreground"
              id="auth-title"
            >
              {isSignupMode ? "Crea tu cuenta" : "Inicia sesión"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSignupMode
                ? "Regístrate para empezar a guardar y gestionar tus dashboards."
                : "Accede para continuar con tus dashboards."}
            </p>
            <div className="my-5 h-px bg-border" />

            <form
              onSubmit={onSubmit}
              className="space-y-4"
              noValidate
              aria-labelledby="auth-title"
            >
              {isSignupMode ? (
                <div>
                  <label
                    htmlFor="name"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    Nombre
                  </label>
                  <input
                    id="name"
                    ref={nameRef}
                    type="text"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    required
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "name-error" : undefined}
                    className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary/20"
                  />
                  {errors.name ? (
                    <p id="name-error" className="mt-1 text-xs text-destructive" aria-live="polite">
                      {errors.name}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Email de acceso
                </label>
                <input
                  id="email"
                  ref={emailRef}
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  required
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary/20"
                />
                {errors.email ? (
                  <p id="email-error" className="mt-1 text-xs text-destructive" aria-live="polite">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  ref={passwordRef}
                  type="password"
                  placeholder="Mín. 8 caracteres"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  required
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary/20"
                />
                {errors.password ? (
                  <p id="password-error" className="mt-1 text-xs text-destructive" aria-live="polite">
                    {errors.password}
                  </p>
                ) : null}
              </div>

              {errors.form ? (
                <p className="text-sm text-destructive" aria-live="polite">
                  {errors.form}
                </p>
              ) : null}

              {successMessage ? (
                <p className="text-sm text-emerald-600" aria-live="polite">
                  {successMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={buttonDisabled}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                    Procesando...
                  </>
                ) : isSignupMode ? (
                  "Crear cuenta →"
                ) : (
                  "Entrar al dashboard →"
                )}
              </button>
            </form>

            <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
              {isSignupMode
                ? "Al crear una cuenta, aceptas nuestros "
                : "Al iniciar sesión, aceptas nuestros "}
              <Link href="/terminos" target="_blank" className="underline">
                Términos de servicio
              </Link>
              {" y la "}
              <Link href="/privacidad" target="_blank" className="underline">
                Política de privacidad
              </Link>
            </p>

            <p className="mt-3 text-center text-sm text-muted-foreground">
              {isSignupMode ? (
                <>
                  ¿Ya tienes cuenta?{" "}
                  <Link
                    href={buildAuthHref("login")}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Inicia sesión
                  </Link>
                </>
              ) : (
                <>
                  ¿Todavía no tienes cuenta?{" "}
                  <Link
                    href={buildAuthHref("signup")}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Crea una
                  </Link>
                </>
              )}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}