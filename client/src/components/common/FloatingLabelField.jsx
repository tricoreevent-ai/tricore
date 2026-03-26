export default function FloatingLabelField({
  error,
  helper,
  id,
  label,
  textarea = false,
  className = '',
  inputRef = null,
  ...inputProps
}) {
  const inputClasses = [
    'peer block w-full rounded-2xl border border-slate-200 bg-transparent px-4 pb-2.5 pt-5 text-sm',
    'text-slate-900 placeholder-transparent focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none',
    textarea ? 'min-h-[112px] pt-6 resize-none' : '',
    error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  const labelClasses =
    'pointer-events-none absolute left-3 top-2 z-10 origin-[0] -translate-y-4 scale-75 bg-white px-2 text-xs font-medium text-slate-500 transition-all duration-200 ' +
    'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 ' +
    'peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:text-brand-blue';

  return (
    <div className="relative">
      {textarea ? (
        <textarea
          {...inputProps}
          aria-invalid={Boolean(error)}
          className={inputClasses}
          id={id}
          placeholder=" "
          ref={inputRef}
        />
      ) : (
        <input
          {...inputProps}
          aria-invalid={Boolean(error)}
          className={inputClasses}
          id={id}
          placeholder=" "
          ref={inputRef}
        />
      )}

      <label className={labelClasses} htmlFor={id}>
        {label}
      </label>

      {error ? (
        <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
      ) : helper ? (
        <p className="mt-2 text-xs text-slate-500">{helper}</p>
      ) : null}
    </div>
  );
}
