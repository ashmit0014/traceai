export default function Loading() {
  return (
    <div className="loading-page">
      <div className="skeleton title-skeleton" />
      <div className="stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div className="skeleton stat" key={i} />
        ))}
      </div>
      <div className="skeleton panel-skeleton" />
    </div>
  );
}
