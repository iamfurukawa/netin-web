import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Link, NavLink, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { ApiError } from "./api/client";
import { AuthForm } from "./features/auth/AuthForm";
import { currentUser, logout, updateProfile, type User } from "./features/auth/auth-api";
import { DeviceManager } from "./features/devices/DeviceManager";
import { GroupsPanel } from "./features/groups/GroupsPanel";
import { SocialPanel } from "./features/social/SocialPanel";
import { MediaPanel } from "./features/media/MediaPanel";
import { PresenceMenu } from "./features/status/PresenceMenu";
import { AdminPanel } from "./features/admin/AdminPanel";

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

  return <BrowserRouter><main className="page">
    <header className="header">
      <Link className="brand" to="/" aria-label="Netin">NETIN</Link>
      <div className="header-actions">{user && <PresenceMenu />}<span className={`connection connection--${apiState}`}><span aria-hidden="true" className="connection__dot" />{connectionLabel}</span></div>
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
    {user && <Routes>
      <Route element={<Dashboard user={user} onLogout={() => logoutMutation.mutate()} logoutError={logoutMutation.error} />}>
        <Route index element={<SocialPanel userId={user.id} />} />
        <Route path="media" element={<MediaPanel userId={user.id} />} />
        <Route path="status" element={<Navigate to="/" replace />} />
        <Route path="groups" element={<GroupsPanel user={user} />} />
        <Route path="profile" element={<ProfileSettings user={user} />} />
        {user.isAdmin && <Route path="admin/reactions" element={<AdminPanel />} />}
        <Route path="devices" element={<Navigate to="/profile" replace />} />
        {user.isAdmin && <Route path="reactions" element={<Navigate to="/admin/reactions" replace />} />}
        <Route path="interactions" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>}
  </main></BrowserRouter>;
}

function Dashboard({ user, onLogout, logoutError }: { user: User; onLogout: () => void; logoutError: Error | null }) {
  return <section className="dashboard" aria-labelledby="dashboard-title">
    <div className="dashboard-heading"><div><p className="eyebrow">NETIN</p><h1 id="dashboard-title">Olá, {user.displayName}.</h1></div><button className="button--secondary" type="button" onClick={onLogout}>Sair</button></div>
    {logoutError && <p className="notice" role="alert">Não foi possível encerrar a sessão. Tente novamente.</p>}
    <nav className="dashboard-nav" aria-label="Navegação do painel">
      <NavLink end className={({ isActive }) => isActive ? "dashboard-nav__item dashboard-nav__item--active" : "dashboard-nav__item"} to="/">Início</NavLink>
      <NavLink className={({ isActive }) => isActive ? "dashboard-nav__item dashboard-nav__item--active" : "dashboard-nav__item"} to="/media">Mídia</NavLink>
      <NavLink className={({ isActive }) => isActive ? "dashboard-nav__item dashboard-nav__item--active" : "dashboard-nav__item"} to="/groups">Grupos</NavLink>
      <NavLink className={({ isActive }) => isActive ? "dashboard-nav__item dashboard-nav__item--active" : "dashboard-nav__item"} to="/profile">Perfil</NavLink>
      {user.isAdmin && <NavLink className={({ isActive }) => isActive ? "dashboard-nav__item dashboard-nav__item--active" : "dashboard-nav__item"} to="/admin/reactions">Admin</NavLink>}
    </nav>
    <Outlet />
  </section>;
}

function ProfileSettings({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: ({ user: updated }) => queryClient.setQueryData(authQueryKey, { user: updated }),
  });
  return <section className="profile-settings" aria-labelledby="profile-title">
    <div className="section-heading"><div><p className="eyebrow">PERFIL</p><h2 id="profile-title">Sua conta</h2></div></div>
    <section className="profile-card"><span className="profile-swatch" style={{ backgroundColor: user.color ?? "#7560f5" }} aria-hidden="true" /><div><h2>{user.displayName}</h2><p className="muted">{user.email}</p></div></section>
    <form className="profile-editor" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      profileMutation.mutate({ displayName: String(form.get("displayName") ?? ""), color: String(form.get("color") ?? "") || null });
    }}>
      <label>Nome<input name="displayName" defaultValue={user.displayName} minLength={1} maxLength={24} required /></label>
      <label>Cor<input name="color" type="color" defaultValue={user.color ?? "#7560f5"} /></label>
      <button className="button--secondary" type="submit" disabled={profileMutation.isPending}>{profileMutation.isPending ? "Salvando..." : "Salvar perfil"}</button>
      {profileMutation.error && <p className="form-error" role="alert">Não foi possível salvar o perfil.</p>}
    </form>
    <DeviceManager />
  </section>;
}
