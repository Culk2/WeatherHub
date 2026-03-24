import {
  SignInButton,
  SignOutButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton
} from "@clerk/clerk-react";

export default function ProfilePanel({
  favorites,
  favoritesStatus,
  onSettingsChange,
  settings,
  user
}) {
  return (
    <section className="panel compact-panel">
      <div className="panel-head">
        <div>
          <h3>Uporabniški profil</h3>
          <p className="muted profile-copy">
            {user?.firstName ? `Pozdravljen, ${user.firstName}.` : "Profil uporabnika"}
          </p>
        </div>
        <SignedIn>
          <div className="user-badge">
            <UserButton afterSignOutUrl="/" />
          </div>
        </SignedIn>
      </div>

      <SignedOut>
        <div className="auth-shell">
          <p className="muted">Clerk upravlja registracijo, prijavo in sejo.</p>
          <div className="cta-row">
            <SignInButton mode="modal">
              <button type="button">Prijava</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="ghost" type="button">
                Registracija
              </button>
            </SignUpButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="settings-list">
          <div className="setting-block">
            <span className="setting-label">Enote</span>
            <div className="segmented-control">
              <button
                className={settings.units === "C" ? "segment-active" : ""}
                type="button"
                onClick={() => onSettingsChange({ units: "C" })}
              >
                °C
              </button>
              <button
                className={settings.units === "F" ? "segment-active" : ""}
                type="button"
                onClick={() => onSettingsChange({ units: "F" })}
              >
                °F
              </button>
            </div>
          </div>

          <div className="setting-block">
            <label className="setting-label" htmlFor="default-location">
              Privzeta lokacija
            </label>
            <select
              id="default-location"
              className="settings-select"
              value={settings.defaultLocationId}
              onChange={(event) =>
                onSettingsChange({
                  defaultLocationId: event.target.value
                })
              }
            >
              <option value="">Brez privzete lokacije</option>
              {favorites.map((favorite) => (
                <option key={favorite._id} value={favorite._id}>
                  {favorite.cityName}
                  {favorite.country ? `, ${favorite.country}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-block">
            <span className="setting-label">Tema</span>
            <div className="segmented-control">
              <button
                className={settings.theme === "light" ? "segment-active" : ""}
                type="button"
                onClick={() => onSettingsChange({ theme: "light" })}
              >
                Light
              </button>
              <button
                className={settings.theme === "dark" ? "segment-active" : ""}
                type="button"
                onClick={() => onSettingsChange({ theme: "dark" })}
              >
                Dark
              </button>
            </div>
          </div>

          {favoritesStatus === "config-error" && (
            <p className="status error">Sanity ni nastavljen.</p>
          )}
          {favoritesStatus === "error" && (
            <p className="status error">Branje iz Sanity ni uspelo.</p>
          )}

          <SignOutButton>
            <button className="signout-button" type="button">
              Odjava
            </button>
          </SignOutButton>
        </div>
      </SignedIn>
    </section>
  );
}
