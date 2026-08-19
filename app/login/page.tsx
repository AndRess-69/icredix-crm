import { LoginForm } from "@/components/layout/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-[#7000FF]/10 blur-3xl" />
      </div>
      <div className="relative z-10">
        <LoginForm />
      </div>
    </div>
  );
}
