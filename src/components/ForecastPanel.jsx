import { formatDay, formatTempByUnit, weatherLabel } from "../lib/weather";

export default function ForecastPanel({ forecast, settings }) {
  return (
    <section className="panel forecast-panel">
      <div className="section-head">
        <h3>Napoved</h3>
        <span className="section-meta">Naslednjih 5 dni</span>
      </div>

      <div className="forecast-grid">
        {forecast.length === 0 && <p className="hint">Forecast bo prikazan po izbiri lokacije.</p>}
        {forecast.map((day) => {
          const meta = weatherLabel(day.weatherCode);

          return (
            <div className="forecast-card" key={day.date}>
              <p className="forecast-day">{formatDay(day.date)}</p>
              <div className="forecast-icon">{meta.icon}</div>
              <p className="forecast-temp">
                {formatTempByUnit(day.maxTemperature, settings.units)}
              </p>
              <p className="forecast-low">
                L: {formatTempByUnit(day.minTemperature, settings.units)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
