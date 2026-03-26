import AppIcon from './AppIcon.jsx';

export default function FormAlert({ type = 'error', message }) {
  if (!message) {
    return null;
  }

  const className =
    type === 'success'
      ? 'rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700'
      : 'rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600';

  return (
    <div className={`flex items-start gap-3 ${className}`.trim()}>
      <AppIcon className="mt-0.5 h-4 w-4 shrink-0" name={type === 'success' ? 'check' : 'warning'} />
      <p>{message}</p>
    </div>
  );
}
