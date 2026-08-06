import { type FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { ApiError } from "../../api/client";
import { login, register, type User } from "./auth-api";

type Mode = "login" | "register";

type Props = {
  onAuthenticated: (user: User) => void;
};

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "email_already_registered") return "Este e-mail já possui uma conta.";
    if (error.code === "invalid_credentials") return "E-mail ou senha incorretos.";
    if (error.status === 400) return "Revise os dados informados.";
  }
  return "Não foi possível falar com o serviço. Tente novamente.";
}

export function AuthForm({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [color, setColor] = useState("#7560f5");
  const mutation = useMutation({
    mutationFn: () => mode === "login" ? login(email, password) : register(displayName, email, password, color),
    onSuccess: (response) => onAuthenticated(response.user),
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.reset();
    await mutation.mutateAsync().catch(() => undefined);
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    mutation.reset();
  }

  const isRegister = mode === "register";
  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="tabs" role="tablist" aria-label="Acesso à conta">
        <button className={mode === "login" ? "tab tab--active" : "tab"} type="button" role="tab" aria-selected={mode === "login"} onClick={() => changeMode("login")}>Entrar</button>
        <button className={isRegister ? "tab tab--active" : "tab"} type="button" role="tab" aria-selected={isRegister} onClick={() => changeMode("register")}>Criar conta</button>
      </div>
      <div className="auth-card__body">
        <p className="eyebrow">{isRegister ? "PRIMEIRO ACESSO" : "BEM-VINDO DE VOLTA"}</p>
        <h2 id="auth-title">{isRegister ? "Crie sua conta" : "Entre na sua conta"}</h2>
        <p className="muted">{isRegister ? "Use seu e-mail para conectar seus dispositivos Netin." : "Acesse seus dispositivos e status sincronizados."}</p>
        <form onSubmit={submit}>
          {isRegister && <label>Nome de exibição<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={24} required autoComplete="name" /></label>}
          <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
          <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} required autoComplete={isRegister ? "new-password" : "current-password"} /></label>
          {isRegister && <label>Cor do perfil<span className="color-field"><input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Cor do perfil" /><code>{color}</code></span></label>}
          {mutation.error && <p className="form-error" role="alert">{errorMessage(mutation.error)}</p>}
          <button className="button--primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Aguarde..." : isRegister ? "Criar conta" : "Entrar"}</button>
        </form>
      </div>
    </section>
  );
}
