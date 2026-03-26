import { useEffect, useState } from 'react';

import { updatePayoutDetails } from '../../api/authApi.js';
import { getUserDashboard } from '../../api/dashboardApi.js';
import FormAlert from '../../components/common/FormAlert.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import useAuth from '../../hooks/useAuth.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters.js';

const createInitialPayoutForm = (user) => ({
  upiId: user?.payoutDetails?.upiId || '',
  accountHolderName: user?.payoutDetails?.accountHolderName || '',
  accountNumber: user?.payoutDetails?.accountNumber || '',
  bankName: user?.payoutDetails?.bankName || '',
  ifscCode: user?.payoutDetails?.ifscCode || '',
  branchName: user?.payoutDetails?.branchName || '',
  notes: user?.payoutDetails?.notes || ''
});

const getPaymentBadgeClass = (status) => {
  if (status === 'Confirmed') {
    return 'badge bg-emerald-50 text-emerald-700';
  }

  if (status === 'Under Review') {
    return 'badge bg-amber-50 text-amber-700';
  }

  if (status === 'Failed') {
    return 'badge bg-red-50 text-red-600';
  }

  return 'badge bg-slate-100 text-slate-600';
};

export default function UserDashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState({ registrations: [], matches: [] });
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState(() => createInitialPayoutForm(user));
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setProfileForm(createInitialPayoutForm(user));
  }, [user]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await getUserDashboard();
        setDashboard(response);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;

    setProfileForm((current) => ({
      ...current,
      [name]: value
    }));
    setProfileError('');
    setProfileSuccess('');
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      await updatePayoutDetails(profileForm);
      setProfileSuccess('Payout details updated successfully.');
    } catch (requestError) {
      setProfileError(getApiErrorMessage(requestError, 'Unable to update payout details.'));
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading your dashboard..." />;
  }

  return (
    <div className="container-shell py-16">
      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">User dashboard</p>
        <h1 className="mt-3 text-4xl font-bold">Registrations, payments, and payout settings</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <h2 className="text-2xl font-bold">Registered Events</h2>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 pr-4">Event</th>
                  <th className="pb-3 pr-4">Registration</th>
                  <th className="pb-3 pr-4">Payment</th>
                  <th className="pb-3">Fee</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.registrations.length ? (
                  dashboard.registrations.map((registration) => (
                    <tr className="border-b border-slate-100" key={registration._id}>
                      <td className="py-4 pr-4 align-top">
                        <p className="font-semibold text-slate-950">{registration.eventId?.name}</p>
                        <p className="text-slate-500">{formatDate(registration.eventId?.startDate)}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {registration.teamName || registration.name}
                        </p>
                      </td>
                      <td className="py-4 pr-4 align-top text-slate-600">
                        <span className={registration.status === 'Confirmed' ? 'badge bg-emerald-50 text-emerald-700' : 'badge bg-slate-100 text-slate-600'}>
                          {registration.status}
                        </span>
                      </td>
                      <td className="py-4 pr-4 align-top text-slate-600">
                        <span className={getPaymentBadgeClass(registration.paymentId?.status)}>
                          {registration.paymentId?.status || 'Pending'}
                        </span>
                        <p className="mt-2 text-xs text-slate-500">Method: {registration.paymentId?.method || '-'}</p>
                        {registration.paymentId?.manualReference ? (
                          <p className="mt-1 text-xs text-slate-500">Reference: {registration.paymentId.manualReference}</p>
                        ) : null}
                      </td>
                      <td className="py-4 align-top text-slate-600">{formatCurrency(registration.paymentId?.amount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-6 text-slate-500" colSpan="4">
                      No registrations found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel p-6">
          <h2 className="text-2xl font-bold">Upcoming Matches</h2>
          <div className="mt-6 space-y-4">
            {dashboard.matches.length ? (
              dashboard.matches.map((match) => (
                <div className="rounded-3xl bg-slate-50 p-5" key={match._id}>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">{match.eventId?.name}</p>
                  <p className="mt-2 text-sm text-slate-500">{match.roundLabel || 'Knockout Match'}</p>
                  <p className="mt-3 text-xl font-bold text-slate-950">
                    {match.teamA} vs {match.teamB}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{match.scheduledAt ? formatDateTime(match.scheduledAt) : 'Schedule pending'}</p>
                  <p className="mt-1 text-sm text-slate-500">{match.venue || 'Venue to be announced'}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No upcoming matches published for your registered events.</p>
            )}
          </div>
        </section>
      </div>

      <form className="panel mt-6 space-y-6 p-6" onSubmit={handleProfileSubmit}>
        <div>
          <h2 className="text-2xl font-bold">Refund / Payout Details</h2>
          <p className="mt-2 text-sm text-slate-500">
            Save the payment details that TriCore should use if a refund or payout needs to be sent to you.
          </p>
        </div>

        <FormAlert message={profileError} />
        <FormAlert message={profileSuccess} type="success" />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="label" htmlFor="upiId">UPI ID</label>
            <input className="input" id="upiId" name="upiId" onChange={handleProfileChange} value={profileForm.upiId} />
          </div>
          <div>
            <label className="label" htmlFor="accountHolderName">Account Holder</label>
            <input className="input" id="accountHolderName" name="accountHolderName" onChange={handleProfileChange} value={profileForm.accountHolderName} />
          </div>
          <div>
            <label className="label" htmlFor="accountNumber">Account Number</label>
            <input className="input" id="accountNumber" name="accountNumber" onChange={handleProfileChange} value={profileForm.accountNumber} />
          </div>
          <div>
            <label className="label" htmlFor="bankName">Bank Name</label>
            <input className="input" id="bankName" name="bankName" onChange={handleProfileChange} value={profileForm.bankName} />
          </div>
          <div>
            <label className="label" htmlFor="ifscCode">IFSC</label>
            <input className="input" id="ifscCode" name="ifscCode" onChange={handleProfileChange} value={profileForm.ifscCode} />
          </div>
          <div>
            <label className="label" htmlFor="branchName">Branch</label>
            <input className="input" id="branchName" name="branchName" onChange={handleProfileChange} value={profileForm.branchName} />
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <label className="label" htmlFor="notes">Notes</label>
            <textarea className="input min-h-24" id="notes" name="notes" onChange={handleProfileChange} value={profileForm.notes} />
          </div>
        </div>

        <button className="btn-primary" disabled={savingProfile} type="submit">
          {savingProfile ? 'Saving...' : 'Save Payout Details'}
        </button>
      </form>
    </div>
  );
}
