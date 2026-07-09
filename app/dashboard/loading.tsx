export default function DashboardRouteLoading() {
  return (
    <div className="workspace-content-loading" aria-label="Carregando conteúdo">
      <div className="workspace-loading-heading"><i /><span /></div>
      <div className="workspace-loading-metrics">{Array.from({ length: 4 }, (_, index) => <i key={index} />)}</div>
      <div className="workspace-loading-panels"><i /><i /><i /></div>
    </div>
  );
}
