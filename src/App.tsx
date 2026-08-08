import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "./api/client";
import { AuthForm } from "./features/auth/AuthForm";
import { currentUser, logout, type User } from "./features/auth/auth-api";
import { DeviceManager } from "./features/devices/DeviceManager";
import { GroupsPanel } from "./features/groups/GroupsPanel";

const authQueryKey = ["auth", "me"] as const;

export function App() {
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: authQueryKey,
    queryFn: currentUser,
    retry: (failureCount, error) => !(error instanceof ApiError && error.status === 401) && failureCount < 1,
  });
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ["devices"] });
      await queryClient.invalidateQueries({ queryKey: authQueryKey });
    },
  });

  const isGuest = session.error instanceof ApiError && session.error.status === 401;
  const apiState = session.isPending ? "checking" : isGuest || session.isSuccess ? "online" : "offline";
  const user = session.data?.user ?? null;
  const connectionLabel = { checking: "Verificando serviço", online: "Serviço conectado", offline: "Serviço indisponível" }[apiState];

  return (
    <main className="page">
      <header className="header">
        <a className="brand" href="/" aria-label="Netin">NETIN</a>
        <span className={`connection connection--${apiState}`}><span aria-hidden="true" className="connection__dot" />{connectionLabel}</span>
      </header>

      {session.isPending && <section className="loading-card"><p className="eyebrow">NETIN</p><h1>Preparando seu painel...</h1></section>}

      {!session.isPending && !user && <>
        <section className="hero" aria-labelledby="welcome-title">
          <p className="eyebrow">SEU PAINEL PESSOAL</p>
          <h1 id="welcome-title">Seu status, onde você estiver.</h1>
          <p className="lead">Entre para conectar seu Netin à conta e manter status e dispositivos sincronizados.</p>
        </section>
        {apiState === "offline" && <p className="notice" role="status">Não foi possível alcançar a API. Verifique sua conexão e tente novamente.</p>}
        <AuthForm onAuthenticated={(authenticatedUser) => queryClient.setQueryData(authQueryKey, { user: authenticatedUser })} />
      </>}

      {user && <Dashboard user={user} onLogout={() => logoutMutation.mutate()} logoutError={logoutMutation.error} />}
    </main>
  );
}

function Dashboard({ user, onLogout, logoutError }: { user: User; onLogout: () => void; logoutError: Error | null }) {
  return <section className="dashboard" aria-labelledby="dashboard-title">
    <p className="eyebrow">SUA CONTA</p>
    <h1 id="dashboard-title">Olá, {user.displayName}.</h1>
    <section className="profile-card">
      <span className="profile-swatch" style={{ backgroundColor: user.color ?? "#7560f5" }} aria-hidden="true" />
      <div><h2>{user.displayName}</h2><p className="muted">{user.email}</p></div>
      <button className="button--secondary" type="button" onClick={onLogout}>Sair</button>
    </section>
    {logoutError && <p className="notice" role="alert">Não foi possível encerrar a sessão. Tente novamente.</p>}
    <DeviceManager />
    <GroupsPanel user={user} />
  </section>;
}
