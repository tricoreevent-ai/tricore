const getInitials = (name) =>
  String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

export default function PartnerHighlights({ description, partners, title = 'Partner Highlights' }) {
  if (!partners?.length) {
    return null;
  }

  return (
    <section className="container-shell mt-24">
      <div className="panel p-8 sm:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Trusted Collaboration
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">{title}</h2>
          </div>
          {description ? <p className="max-w-2xl text-base leading-8 text-slate-600">{description}</p> : null}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {partners.map((partner) => (
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-6" key={partner.name}>
              <div className="flex items-start gap-4">
                <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-mist text-lg font-bold text-brand-blue">
                  {getInitials(partner.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                    {partner.role}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-950">{partner.name}</h3>
                  <p className="mt-4 text-base leading-7 text-slate-600">{partner.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
