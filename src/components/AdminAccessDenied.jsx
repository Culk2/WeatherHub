import { SignInButton, SignedOut } from "@clerk/clerk-react";
import { Link } from "./Link";

export default function AdminAccessDenied({ hasGuardConfigured, isLoaded, isSignedIn }) {
  let message = "Do te strani nimaš dostopa.";

  if (!hasGuardConfigured) {
    message =
      "Admin zaščita še ni nastavljena. Dodaj VITE_ADMIN_EMAILS ali VITE_ADMIN_USER_IDS.";
  } else if (!isLoaded) {
    message = "Preverjam dostop do admin strani...";
  } else if (!isSignedIn) {
    message = "Za dostop do admin strani se moraš najprej prijaviti.";
  }

  return (
    <div className="page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">WeatherHub Admin</p>
          <h1>Dostop zavrnjen</h1>
          <p className="muted">{message}</p>
        </div>
        <Link className="ghost admin-back" href="/">
          Nazaj na aplikacijo
        </Link>
      </header>

      {!isSignedIn && hasGuardConfigured && isLoaded && (
        <section className="panel admin-panel">
          <SignedOut>
            <SignInButton mode="modal">
              <button type="button">Prijava</button>
            </SignInButton>
          </SignedOut>
        </section>
      )}
    </div>
  );
}
