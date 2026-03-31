import { formatHour, formatTempByUnit, weatherLabel } from "../lib/weather";

export default function HourlyForecastPanel({ hourly, settings }) {
  return (
    <section className="panel hourly-panel">
      <div className="section-head">
        <h3>Po urah</h3>
        <span className="section-meta">Naslednjih 24 ur</span>
      </div>

      {hourly.length === 0 && <p className="hint">Urna napoved bo prikazana po izbiri lokacije.</p>}

      <div className="hourly-scroll">
        <div className="hourly-row">
          {hourly.map((entry) => {
            const meta = weatherLabel(entry.weatherCode);

            return (
              <div className="hourly-card" key={entry.time}>
                <p className="hourly-time">{formatHour(entry.time)}</p>
                <div className="hourly-icon">{meta.icon}</div>
                <p className="hourly-temp">
                  {formatTempByUnit(entry.temperature, settings.units)}
                </p>
                <p className="hourly-meta">Padavine: {entry.precipitationProbability ?? 0}%</p>
                <p className="hourly-meta">
                  Veter: {entry.windSpeed != null ? `${Math.round(entry.windSpeed)} km/h` : "-"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
