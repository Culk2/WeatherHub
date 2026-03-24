import { formatTempByUnit, weatherLabel } from "../lib/weather";

export default function FavoritesPanel({
  favorites,
  favoritesWeather,
  onRemoveFavorite,
  onSearch,
  onSearchCityChange,
  onSelectFavorite,
  searchCity,
  searchResult,
  settings
}) {
  return (
    <section className="panel compact-panel">
      <div className="section-head">
        <h3>Search + Favorites</h3>
        <span className="section-meta">{favorites.length} krajev</span>
      </div>

      <form className="compact-search" onSubmit={onSearch}>
        <input
          type="text"
          placeholder="Vnesi lokacijo"
          value={searchCity}
          onChange={(event) => onSearchCityChange(event.target.value)}
        />
        <button type="submit">Poisci</button>
      </form>

      <div className="favorites-list">
        {favorites.length === 0 && <p className="hint">Ni shranjenih lokacij.</p>}
        {favorites.map((favorite) => {
          const current = favoritesWeather[favorite._id];
          const isActive =
            searchResult?.name === favorite.cityName &&
            searchResult?.country === favorite.country;

          return (
            <div
              className={`favorite-row ${isActive ? "favorite-row-active" : ""}`}
              key={`quick-${favorite._id}`}
            >
              <div
                className="favorite-row-main"
                onClick={() => onSelectFavorite(favorite)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectFavorite(favorite);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div>
                  <p className="favorite-city">{favorite.cityName}</p>
                  <p className="favorite-label">
                    {current ? weatherLabel(current.weatherCode).label : "Brez podatkov"}
                  </p>
                </div>
                <strong className="favorite-temp">
                  {current ? formatTempByUnit(current.temperature, settings.units) : "--"}
                </strong>
              </div>
              <button
                className="remove-button"
                type="button"
                onClick={() => onRemoveFavorite(favorite._id)}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
