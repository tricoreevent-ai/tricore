import { useMemo } from 'react';

import AppIcon from '../common/AppIcon.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import { formatDate, formatDateTime } from '../../utils/formatters.js';

const fixtureFormatOptions = [
  { value: 'round-robin', label: 'Round Robin' },
  { value: 'group-stage', label: 'Group Stage' },
  { value: 'knockout', label: 'Knockout' }
];

const fixtureMatchTypeOptions = [
  { value: 'League', label: 'League' },
  { value: 'Group Stage', label: 'Group Stage' },
  { value: 'Quarterfinal', label: 'Quarterfinal' },
  { value: 'Semifinal', label: 'Semifinal' },
  { value: 'Final', label: 'Final' },
  { value: 'Third Place', label: 'Third Place' },
  { value: 'Knockout', label: 'Knockout' }
];

const normalizeText = (value) => String(value || '').trim();

const getPlanStatusBadgeClass = (status) => {
  const normalizedStatus = normalizeText(status).toLowerCase();

  if (normalizedStatus === 'approved') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (normalizedStatus === 'draft') {
    return 'bg-sky-50 text-sky-700';
  }

  if (normalizedStatus === 'rejected') {
    return 'bg-red-50 text-red-700';
  }

  return 'bg-slate-100 text-slate-700';
};

function SectionHeader({ title, description, action = null }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

function SummaryCard({ icon, label, value, hint }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-blue">
          <AppIcon className="h-5 w-5" name={icon} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
        </div>
      </div>
      {hint ? <p className="mt-3 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

function InsightList({ icon, title, items = [], emptyMessage, tone = 'default' }) {
  const toneClass =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50'
      : tone === 'danger'
        ? 'border-red-200 bg-red-50'
        : 'border-slate-200 bg-slate-50';

  return (
    <section className={`rounded-3xl border p-5 ${toneClass}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-blue">
          <AppIcon className="h-5 w-5" name={icon} />
        </span>
        <div>
          <h3 className="text-lg font-bold text-slate-950">{title}</h3>
          <p className="text-sm text-slate-500">
            {items.length ? `${items.length} item${items.length === 1 ? '' : 's'} available.` : emptyMessage}
          </p>
        </div>
      </div>

      {items.length ? (
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <div className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-600" key={`${title}-${index}`}>
              {typeof item === 'string' ? item : item}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function ExperimentalFixtureLab({
  event,
  configuration,
  confirmedTeams = [],
  matches = [],
  plan,
  form,
  setForm,
  setPlan,
  loading = false,
  generating = false,
  saving = false,
  approving = false,
  rejecting = false,
  onGenerate,
  onSaveDraft,
  onApprove,
  onReject
}) {
  const activeFixtures = Array.isArray(plan?.fixtures) ? plan.fixtures : [];
  const eventStartDate = event?.startDate ? formatDate(event.startDate) : 'Not set';
  const eventEndDate = event?.endDate ? formatDate(event.endDate) : 'Not set';
  const liveFixturesCount = Array.isArray(matches) ? matches.length : 0;

  const planAnalytics = useMemo(() => {
    const density = new Map();
    const teamLoad = new Map();
    const venueUsage = new Map();

    activeFixtures.forEach((fixture) => {
      const dateKey = normalizeText(fixture.date) || 'Unscheduled';
      density.set(dateKey, (density.get(dateKey) || 0) + 1);

      [fixture.teamA, fixture.teamB].forEach((teamName) => {
        const normalizedTeamName = normalizeText(teamName);
        if (!normalizedTeamName || normalizedTeamName.toLowerCase() === 'bye') {
          return;
        }

        teamLoad.set(normalizedTeamName, (teamLoad.get(normalizedTeamName) || 0) + 1);
      });

      const venueKey = normalizeText(fixture.venue) || 'Venue pending';
      venueUsage.set(venueKey, (venueUsage.get(venueKey) || 0) + 1);
    });

    return {
      density: [...density.entries()].sort((left, right) => right[1] - left[1]),
      teamLoad: [...teamLoad.entries()].sort((left, right) => right[1] - left[1]),
      venueUsage: [...venueUsage.entries()].sort((left, right) => right[1] - left[1])
    };
  }, [activeFixtures]);

  const updateFormField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updateFixtureField = (fixtureId, field, value) => {
    setPlan((current) => ({
      ...current,
      fixtures: (current.fixtures || []).map((fixture) =>
        fixture.id === fixtureId
          ? {
              ...fixture,
              [field]: value,
              ...(field === 'teamA' ? { teamASource: value } : {}),
              ...(field === 'teamB' ? { teamBSource: value } : {})
            }
          : fixture
      )
    }));
  };

  if (loading) {
    return <LoadingSpinner label="Loading experimental AI fixture planner..." />;
  }

  return (
    <div className="space-y-6">
      <section className="panel space-y-6 p-6">
        <SectionHeader
          description="Use the experimental AI planner to prepare a separate draft fixture plan. The live fixture system is not changed until an admin approves the reviewed plan."
          title="AI Fixture Lab"
          action={
            <span className={`badge ${getPlanStatusBadgeClass(plan?.status)}`}>
              {normalizeText(plan?.status || 'empty') || 'empty'}
            </span>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            hint="Confirmed teams pulled from the selected event."
            icon="users"
            label="Teams"
            value={confirmedTeams.length}
          />
          <SummaryCard
            hint="Live fixtures remain untouched until approval."
            icon="matches"
            label="Core Fixtures"
            value={liveFixturesCount}
          />
          <SummaryCard
            hint="Calculated from conflict-free slot placement."
            icon="sparkle"
            label="AI Score"
            value={plan?.optimizationScore || 0}
          />
          <SummaryCard
            hint={
              plan?.generatedAt
                ? `Generated ${formatDateTime(plan.generatedAt)}`
                : 'No AI plan has been generated for this event yet.'
            }
            icon="clock"
            label="Draft Fixtures"
            value={activeFixtures.length}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-blue">
                <AppIcon className="h-5 w-5" name="settings" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-950">Input Parameters</h3>
                <p className="text-sm text-slate-500">
                  Event dates, venue, and saved match setup are used as defaults. Override any field before generating.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="ai-format">
                  Fixture Format
                </label>
                <select
                  className="input"
                  id="ai-format"
                  onChange={(eventValue) => updateFormField('format', eventValue.target.value)}
                  value={form.format}
                >
                  {fixtureFormatOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="ai-rest-days">
                  Minimum Rest Days
                </label>
                <input
                  className="input"
                  id="ai-rest-days"
                  min="0"
                  onChange={(eventValue) => updateFormField('minimumRestDays', eventValue.target.value)}
                  type="number"
                  value={form.minimumRestDays}
                />
              </div>
              <div>
                <label className="label" htmlFor="ai-start-date">
                  Start Date
                </label>
                <input
                  className="input"
                  id="ai-start-date"
                  onChange={(eventValue) => updateFormField('startDate', eventValue.target.value)}
                  type="date"
                  value={form.startDate}
                />
              </div>
              <div>
                <label className="label" htmlFor="ai-end-date">
                  End Date
                </label>
                <input
                  className="input"
                  id="ai-end-date"
                  onChange={(eventValue) => updateFormField('endDate', eventValue.target.value)}
                  type="date"
                  value={form.endDate}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label" htmlFor="ai-venues">
                  Venues
                </label>
                <input
                  className="input"
                  id="ai-venues"
                  onChange={(eventValue) => updateFormField('venuesText', eventValue.target.value)}
                  placeholder="Venue 1, Venue 2"
                  value={form.venuesText}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label" htmlFor="ai-times">
                  Match Timings
                </label>
                <input
                  className="input"
                  id="ai-times"
                  onChange={(eventValue) => updateFormField('timeSlotsText', eventValue.target.value)}
                  placeholder="09:00, 12:00, 15:00, 18:00"
                  value={form.timeSlotsText}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label" htmlFor="ai-dates">
                  Available Dates
                </label>
                <textarea
                  className="input min-h-[108px] py-3"
                  id="ai-dates"
                  onChange={(eventValue) => updateFormField('availableDatesText', eventValue.target.value)}
                  placeholder="2026-04-01, 2026-04-02, 2026-04-03"
                  value={form.availableDatesText}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label" htmlFor="ai-prime-time">
                  Prime Time Fixtures
                </label>
                <input
                  className="input"
                  id="ai-prime-time"
                  onChange={(eventValue) => updateFormField('primeTimeMatchesText', eventValue.target.value)}
                  placeholder="Team A vs Team B, Team C vs Team D"
                  value={form.primeTimeMatchesText}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label" htmlFor="ai-preferred-times">
                  Preferred Team Timings
                </label>
                <textarea
                  className="input min-h-[108px] py-3"
                  id="ai-preferred-times"
                  onChange={(eventValue) =>
                    updateFormField('preferredMatchTimingsText', eventValue.target.value)
                  }
                  placeholder="Team A:09:00|18:00; Team B:12:00"
                  value={form.preferredMatchTimingsText}
                />
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 md:col-span-2">
                <input
                  checked={Boolean(form.noTeamPlaysTwoMatchesSameDay)}
                  onChange={(eventValue) =>
                    updateFormField('noTeamPlaysTwoMatchesSameDay', eventValue.target.checked)
                  }
                  type="checkbox"
                />
                Prevent the same team from playing twice on the same day
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button className="btn-primary" disabled={generating || confirmedTeams.length < 2} onClick={onGenerate} type="button">
                <AppIcon className="mr-2 h-4 w-4" name="sparkle" />
                {generating ? 'Generating...' : 'AI Generate Fixtures'}
              </button>
              <p className="text-sm text-slate-500">
                Defaults from event window {eventStartDate} to {eventEndDate} at {event?.venue || 'venue pending'}.
              </p>
            </div>
          </section>

          <div className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-blue">
                  <AppIcon className="h-5 w-5" name="sparkle" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-950">AI Assistant Panel</h3>
                  <p className="text-sm text-slate-500">
                    Recommendations and conflict flags from the experimental planner.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Saved Match Format</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">{configuration.matchFormat || 'Not set'}</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Experimental Separation</p>
                  <p className="mt-2 text-sm font-medium text-slate-700">
                    Approve to publish. Reject to keep the core schedule unchanged.
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Busy Day</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">
                    {planAnalytics.density[0]
                      ? `${planAnalytics.density[0][0] === 'Unscheduled' ? 'Unscheduled' : formatDate(planAnalytics.density[0][0])} (${planAnalytics.density[0][1]})`
                      : 'No plan yet'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Highest Team Load</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">
                    {planAnalytics.teamLoad[0]
                      ? `${planAnalytics.teamLoad[0][0]} (${planAnalytics.teamLoad[0][1]})`
                      : 'No plan yet'}
                  </p>
                </div>
              </div>
            </section>

            <InsightList
              emptyMessage="Generate a plan to receive optimization suggestions."
              icon="trendUp"
              items={plan?.suggestions || []}
              title="Optimization Suggestions"
            />
            <InsightList
              emptyMessage="No conflicts detected."
              icon="warning"
              items={plan?.alerts || []}
              title="Conflict Alerts"
              tone={plan?.alerts?.length ? 'warning' : 'default'}
            />
          </div>
        </div>
      </section>

      {activeFixtures.length ? (
        <div className="grid gap-6 2xl:grid-cols-[1.25fr_0.75fr]">
          <section className="panel space-y-6 p-6">
            <SectionHeader
              description="Review every AI-generated fixture, adjust opponents or scheduling details where needed, then save the draft or approve it into the core fixture system."
              title="Fixture Preview and Review"
              action={
                <div className="flex flex-wrap gap-3">
                  <button className="btn-secondary" disabled={saving} onClick={onSaveDraft} type="button">
                    {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button className="btn-primary" disabled={approving} onClick={onApprove} type="button">
                    {approving ? 'Approving...' : 'Approve to Core Fixtures'}
                  </button>
                  <button className="btn-secondary border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700" disabled={rejecting} onClick={onReject} type="button">
                    {rejecting ? 'Rejecting...' : 'Reject Draft'}
                  </button>
                </div>
              }
            />

            <div className="space-y-4">
              {activeFixtures.map((fixture) => (
                <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5" key={fixture.id}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="badge bg-sky-50 text-sky-700">{fixture.matchType || 'Match'}</span>
                        {fixture.groupName ? (
                          <span className="badge bg-slate-100 text-slate-700">{fixture.groupName}</span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-lg font-bold text-slate-950">
                        {fixture.teamA} vs {fixture.teamB}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {fixture.roundLabel || 'AI round'} • Match {fixture.matchNumber}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:w-[540px]">
                      <input
                        className="input"
                        onChange={(eventValue) =>
                          updateFixtureField(fixture.id, 'teamA', eventValue.target.value)
                        }
                        placeholder="Team A"
                        value={fixture.teamA || ''}
                      />
                      <input
                        className="input"
                        onChange={(eventValue) =>
                          updateFixtureField(fixture.id, 'teamB', eventValue.target.value)
                        }
                        placeholder="Team B"
                        value={fixture.teamB || ''}
                      />
                      <select
                        className="input"
                        onChange={(eventValue) =>
                          updateFixtureField(fixture.id, 'matchType', eventValue.target.value)
                        }
                        value={fixture.matchType || 'League'}
                      >
                        {fixtureMatchTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <input
                        className="input"
                        onChange={(eventValue) =>
                          updateFixtureField(fixture.id, 'venue', eventValue.target.value)
                        }
                        placeholder="Venue"
                        value={fixture.venue || ''}
                      />
                      <input
                        className="input"
                        onChange={(eventValue) =>
                          updateFixtureField(fixture.id, 'date', eventValue.target.value)
                        }
                        type="date"
                        value={fixture.date || ''}
                      />
                      <input
                        className="input"
                        onChange={(eventValue) =>
                          updateFixtureField(fixture.id, 'time', eventValue.target.value)
                        }
                        type="time"
                        value={fixture.time || ''}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="panel space-y-5 p-6">
              <SectionHeader
                description="Heatmap-style summaries help spot crowded days, overloaded teams, and uneven venue usage before approval."
                title="Fixture Optimization Heatmaps"
              />

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Match Density per Day</p>
                  <div className="mt-3 grid gap-3">
                    {planAnalytics.density.length ? (
                      planAnalytics.density.map(([dateKey, count]) => (
                        <div className="rounded-2xl bg-slate-50 p-4" key={dateKey}>
                          <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                            <span>{dateKey === 'Unscheduled' ? 'Unscheduled' : formatDate(dateKey)}</span>
                            <span>{count} match{count === 1 ? '' : 'es'}</span>
                          </div>
                          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
                            <div
                              className="h-full rounded-full bg-brand-blue"
                              style={{ width: `${Math.min(100, count * 14)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">No AI fixtures available for density review.</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Team Workload</p>
                    <div className="mt-3 space-y-2">
                      {planAnalytics.teamLoad.slice(0, 5).map(([teamName, count]) => (
                        <div className="flex items-center justify-between text-sm text-slate-700" key={teamName}>
                          <span>{teamName}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                      {!planAnalytics.teamLoad.length ? (
                        <p className="text-sm text-slate-500">No team workload data yet.</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Venue Utilization</p>
                    <div className="mt-3 space-y-2">
                      {planAnalytics.venueUsage.slice(0, 5).map(([venueName, count]) => (
                        <div className="flex items-center justify-between text-sm text-slate-700" key={venueName}>
                          <span>{venueName}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                      {!planAnalytics.venueUsage.length ? (
                        <p className="text-sm text-slate-500">No venue usage data yet.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <InsightList
              emptyMessage="Group recommendations will appear when group stage planning is used."
              icon="users"
              items={(plan?.groupSuggestions || []).map((group) => `${group.label}: ${group.teams.join(', ')}`)}
              title="Suggested Group Divisions"
            />
            <InsightList
              emptyMessage="No automatic reschedule suggestions yet."
              icon="refresh"
              items={(plan?.rescheduleSuggestions || []).map(
                (item) =>
                  `${item.fixture}: ${item.suggestedDate || 'date pending'} ${item.suggestedTime || ''} at ${item.suggestedVenue || 'venue pending'}`
              )}
              title="Automatic Reschedule Suggestions"
            />
          </div>
        </div>
      ) : (
        <section className="panel p-6">
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-blue">
              <AppIcon className="h-6 w-6" name="sparkle" />
            </div>
            <h3 className="mt-5 text-xl font-bold text-slate-950">No experimental AI plan yet</h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Generate a plan to preview balanced fixtures, scheduling recommendations, and reschedule suggestions. The live fixture list will stay unchanged until approval.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
