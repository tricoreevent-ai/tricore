export default function PartnerHighlights({ description, partners, title = 'Partner Highlights' }) {
  if (!partners?.length) {
    return null;
  }

  return (
    <section className="container-shell mt-24">
      <div className="panel p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Collaboration
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">{title}</h2>
          </div>
          {description ? <p className="max-w-2xl text-sm leading-7 text-slate-600">{description}</p> : null}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {partners.map((partner) => (
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-6" key={partner.name}>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                {partner.role}
              </p>
              <h3 className="mt-3 text-2xl font-bold text-slate-950">{partner.name}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">{partner.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
