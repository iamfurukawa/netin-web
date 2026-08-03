import { useEffect, useState } from "react";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
type ApiState = "checking" | "online" | "offline";

export function App() {
  const [apiState, setApiState] = useState<ApiState>("checking");
  async function checkApi() {
    setApiState("checking");
    try {
      const response = await fetch(`${apiBaseUrl}/health`, { headers: { Accept: "application/json" } });
      setApiState(response.ok ? "online" : "offline");
    } catch { setApiState("offline"); }
  }
  useEffect(() => { void checkApi(); }, []);
  const connectionLabel = { checking: "Verificando serviço", online: "Serviço conectado", offline: "Serviço indisponível" }[apiState];
  return (
    <main className="page">
      <header className="header">
        <a className="brand" href="/" aria-label="Netin">NETIN</a>
        <span className={`connection connection--${apiState}`}><span aria-hidden="true" className="connection__dot" />{connectionLabel}</span>
      </header>
      <section className="hero" aria-labelledby="welcome-title">
        <p className="eyebrow">SEU PAINEL PESSOAL</p>
        <h1 id="welcome-title">Seu status, onde você estiver.</h1>
        <p className="lead">Conecte seu Netin à sua conta para manter status, amigos e mensagens sincronizados.</p>
      </section>
      <section className="card" aria-labelledby="next-title">
        <div className="card__icon" aria-hidden="true">01</div>
        <div><p className="eyebrow">PRÓXIMO PASSO</p><h2 id="next-title">Crie ou acesse sua conta</h2><p>O acesso por e-mail e senha será liberado assim que o serviço de contas estiver disponível.</p></div>
        <button type="button" disabled>Em breve</button>
      </section>
      <section className="support" aria-labelledby="connection-title">
        <div><h2 id="connection-title">Conexão</h2><p>O aplicativo conversa com o serviço seguro do Netin.</p></div>
        <button className="button--secondary" type="button" onClick={() => void checkApi()}>Testar conexão</button>
      </section>
      {apiState === "offline" && <p className="notice" role="status">Não foi possível alcançar a API. Verifique a conexão e tente novamente.</p>}
    </main>
  );
}
