export default function SiteNotice({ notice }) {
  if (!notice?.isActive || (!notice.title && !notice.message)) {
    return null;
  }

  return (
    <section className="panel site-notice">
      <p className="site-notice-kicker">Pomembno obvestilo</p>
      {notice.title && <h3>{notice.title}</h3>}
      {notice.message && <p className="site-notice-copy">{notice.message}</p>}
    </section>
  );
}
