const monthFormatter = new Intl.DateTimeFormat("sl-SI", {
  month: "long",
  year: "numeric"
});

function formatMonthRange(startDate, endDate) {
  return `${monthFormatter.format(new Date(startDate))} - ${monthFormatter.format(
    new Date(endDate)
  )}`;
}

export default function PrecipitationHistoryPanel({ history, status }) {
  const maxPrecipitation = history
    ? Math.max(...history.months.map((entry) => entry.precipitationSum), 1)
    : 1;

  return (
    <section className="panel precipitation-panel">
      <div className="section-head">
        <h3>Padavine po mesecih</h3>
        <span className="section-meta">
          {history
            ? formatMonthRange(history.startDate, history.endDate)
            : "Zgodovina padavin"}
        </span>
      </div>

      {status === "loading" && <p className="hint">Nalagam zgodovino padavin...</p>}
      {status === "error" && (
        <p className="status error">Branje zgodovine padavin ni uspelo.</p>
      )}
      {!history && status !== "loading" && status !== "error" && (
        <p className="hint">Padavine bodo prikazane po izbiri lokacije.</p>
      )}

      {history && (
        <div className="precipitation-content">
          <div className="precipitation-summary">
            <div className="precipitation-stat">
              <span>Skupaj v 12 mesecih</span>
              <strong>{history.totalPrecipitation.toFixed(1)} mm</strong>
            </div>
            <div className="precipitation-stat">
              <span>Najbolj moker mesec</span>
              <strong>
                {history.wettestMonth
                  ? `${monthFormatter.format(new Date(history.wettestMonth.date))} : ${history.wettestMonth.precipitationSum.toFixed(1)} mm`
                  : "-"}
              </strong>
            </div>
          </div>

          <div className="precipitation-chart">
            <div className="precipitation-chart-scroll">
              <div className="precipitation-bars">
                {history.months.map((month) => {
                  const height = Math.max(
                    12,
                    (month.precipitationSum / maxPrecipitation) * 170
                  );

                  return (
                    <div className="precipitation-day" key={month.date}>
                      <div className="precipitation-bar-wrap">
                        <div className="precipitation-value">
                          {month.precipitationSum.toFixed(1)}
                        </div>
                        <div className="precipitation-bar" style={{ height }} />
                      </div>
                      <div className="precipitation-date">
                        {new Date(month.date).toLocaleDateString("sl-SI", {
                          month: "short",
                          year: "2-digit"
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
