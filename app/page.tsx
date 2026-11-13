export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="status-card" aria-labelledby="page-title">
        <p className="eyebrow">Nova aplicação</p>
        <h1 id="page-title">ObraFlow</h1>
        <p>
          A base Next.js está ativa. As jornadas do protótipo Evidence serão
          migradas gradualmente, mantendo o protótipo disponível durante a
          transição.
        </p>
        <span className="status-badge">Migração em andamento</span>
      </section>
    </main>
  );
}
