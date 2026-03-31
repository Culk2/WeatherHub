import { Link } from "./Link";

export default function AdminPage({
  noticeDraft,
  noticeStatus,
  onDraftChange,
  onSave,
  sanityConfigured
}) {
  return (
    <div className="page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">WeatherHub Admin</p>
          <h1>Upravljanje obvestila</h1>
          <p className="muted">
            Tukaj lahko nastaviš globalno obvestilo, ki se pokaže uporabnikom na dnu strani.
          </p>
        </div>
        <Link className="ghost admin-back" href="/">
          Nazaj na aplikacijo
        </Link>
      </header>

      <section className="panel admin-panel">
        {!sanityConfigured && (
          <p className="status error">
            Sanity ni nastavljen. Brez tega obvestila ne moreš shraniti.
          </p>
        )}

        <div className="admin-form">
          <label className="setting-block">
            <span className="setting-label">Naslov</span>
            <input
              type="text"
              placeholder="Na primer: Motnje pri osveževanju podatkov"
              value={noticeDraft.title}
              onChange={(event) => onDraftChange({ title: event.target.value })}
            />
          </label>

          <label className="setting-block">
            <span className="setting-label">Sporočilo</span>
            <textarea
              className="settings-textarea"
              placeholder="Vpiši pomembno obvestilo za uporabnike..."
              rows={6}
              value={noticeDraft.message}
              onChange={(event) => onDraftChange({ message: event.target.value })}
            />
          </label>

          <label className="notice-toggle">
            <input
              type="checkbox"
              checked={noticeDraft.isActive}
              onChange={(event) => onDraftChange({ isActive: event.target.checked })}
            />
            <span>Obvestilo je aktivno</span>
          </label>

          <div className="admin-actions">
            <button type="button" onClick={onSave}>
              Shrani obvestilo
            </button>
            {noticeStatus && <p className="status">{noticeStatus}</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
