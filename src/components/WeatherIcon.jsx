export default function WeatherIcon({ icon, tone }) {
  return (
    <div className={`weather-symbol weather-symbol-${tone}`}>
      <div className="weather-symbol-shell">
        <span className="icon-text">{icon}</span>
      </div>
    </div>
  );
}
