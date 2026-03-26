import { useEffect, useId, useMemo, useRef, useState } from 'react';

import AppIcon from './AppIcon.jsx';

const normalizeOptions = (options = []) =>
  (Array.isArray(options) ? options : []).map((option) => ({
    value: String(option?.value ?? ''),
    label: String(option?.label ?? ''),
    disabled: Boolean(option?.disabled),
    searchText: String(option?.searchText || option?.label || '').toLowerCase(),
    meta: option?.meta
  }));

const normalizeGroups = (groups = []) =>
  (Array.isArray(groups) ? groups : []).map((group) => ({
    label: String(group?.label || ''),
    options: normalizeOptions(group?.options || [])
  }));

const findSelectedOption = (optionGroups, currentValue) => {
  const normalizedValue = String(currentValue ?? '');

  for (const group of optionGroups) {
    const match = group.options.find((option) => option.value === normalizedValue);
    if (match) {
      return match;
    }
  }

  return null;
};

const createEventLike = (name, value) => ({
  target: {
    name,
    value
  }
});

export default function TypeaheadSelect({
  id,
  name,
  value,
  onChange,
  onValueChange,
  options = [],
  groups = [],
  disabled = false,
  placeholder = 'Select an option',
  searchPlaceholder = 'Type to search...',
  noOptionsMessage = 'No options available.',
  noResultsMessage = 'No matching options found.',
  className = '',
  menuClassName = '',
  compact = false
}) {
  const generatedId = useId();
  const controlId = id || `typeahead-${generatedId}`;
  const listboxId = `${controlId}-listbox`;
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedValue, setHighlightedValue] = useState('');

  const optionGroups = useMemo(() => {
    const normalizedGroups = normalizeGroups(groups);

    if (normalizedGroups.length) {
      return normalizedGroups;
    }

    return [
      {
        label: '',
        options: normalizeOptions(options)
      }
    ];
  }, [groups, options]);

  const selectedOption = useMemo(
    () => findSelectedOption(optionGroups, value),
    [optionGroups, value]
  );

  const effectiveQuery =
    isOpen && query === (selectedOption?.label || '') ? '' : query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!effectiveQuery) {
      return optionGroups;
    }

    return optionGroups
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => option.searchText.includes(effectiveQuery))
      }))
      .filter((group) => group.options.length);
  }, [effectiveQuery, optionGroups]);

  const visibleOptions = useMemo(
    () => filteredGroups.flatMap((group) => group.options),
    [filteredGroups]
  );

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedOption?.label || '');
    }
  }, [isOpen, selectedOption]);

  useEffect(() => {
    if (!visibleOptions.length) {
      setHighlightedValue('');
      return;
    }

    if (!visibleOptions.some((option) => option.value === highlightedValue && !option.disabled)) {
      const firstEnabled = visibleOptions.find((option) => !option.disabled);
      setHighlightedValue(firstEnabled?.value || '');
    }
  }, [highlightedValue, visibleOptions]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (wrapperRef.current?.contains(event.target)) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  const emitChange = (nextValue, option) => {
    onChange?.(createEventLike(name, nextValue));
    onValueChange?.(nextValue, option);
  };

  const handleSelect = (option) => {
    if (!option || option.disabled) {
      return;
    }

    setQuery(option.label);
    setHighlightedValue(option.value);
    setIsOpen(false);
    emitChange(option.value, option);
  };

  const handleInputFocus = () => {
    if (disabled) {
      return;
    }

    setIsOpen(true);
    requestAnimationFrame(() => {
      inputRef.current?.select();
    });
  };

  const moveHighlight = (direction) => {
    const enabledOptions = visibleOptions.filter((option) => !option.disabled);

    if (!enabledOptions.length) {
      return;
    }

    const currentIndex = enabledOptions.findIndex((option) => option.value === highlightedValue);
    const nextIndex =
      currentIndex === -1
        ? 0
        : (currentIndex + direction + enabledOptions.length) % enabledOptions.length;

    setHighlightedValue(enabledOptions[nextIndex].value);
  };

  const inputValue = isOpen ? query : selectedOption?.label || '';
  const inputClasses = compact
    ? `w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 disabled:cursor-not-allowed disabled:bg-slate-100 ${className}`.trim()
    : `input pl-11 pr-11 ${className}`.trim();
  const optionButtonBaseClass = compact
    ? 'rounded-xl px-3 py-2 text-sm'
    : 'rounded-2xl px-3.5 py-3 text-sm';

  return (
    <div className="relative" ref={wrapperRef}>
      {name ? <input name={name} type="hidden" value={String(value ?? '')} /> : null}
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
        <AppIcon className={compact ? 'h-4 w-4' : 'h-5 w-5'} name="search" />
      </div>
      <input
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        autoComplete="off"
        className={inputClasses}
        disabled={disabled}
        id={controlId}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={handleInputFocus}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
            }
            moveHighlight(1);
            return;
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (!isOpen) {
              setIsOpen(true);
            }
            moveHighlight(-1);
            return;
          }

          if (event.key === 'Enter' && isOpen) {
            event.preventDefault();
            const option = visibleOptions.find((item) => item.value === highlightedValue);
            if (option) {
              handleSelect(option);
            }
            return;
          }

          if (event.key === 'Escape') {
            event.preventDefault();
            setIsOpen(false);
          }
        }}
        placeholder={isOpen ? searchPlaceholder : placeholder}
        ref={inputRef}
        role="combobox"
        value={inputValue}
      />
      <button
        aria-label={isOpen ? 'Close options' : 'Open options'}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400"
        disabled={disabled}
        onClick={() => {
          if (disabled) {
            return;
          }

          setIsOpen((current) => !current);

          if (!isOpen) {
            requestAnimationFrame(() => {
              inputRef.current?.focus();
              inputRef.current?.select();
            });
          }
        }}
        type="button"
      >
        <AppIcon className={compact ? 'h-4 w-4' : 'h-5 w-5'} name={isOpen ? 'chevronUp' : 'chevronDown'} />
      </button>

      {isOpen ? (
        <div
          className={`absolute z-40 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ${menuClassName}`.trim()}
          id={listboxId}
          role="listbox"
        >
          {visibleOptions.length ? (
            filteredGroups.map((group) => (
              <div className="space-y-1" key={group.label || 'default'}>
                {group.label ? (
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {group.label}
                  </p>
                ) : null}
                {group.options.map((option) => {
                  const isSelected = option.value === String(value ?? '');
                  const isHighlighted = option.value === highlightedValue;

                  return (
                    <button
                      className={`flex w-full items-center justify-between gap-3 text-left transition ${
                        option.disabled
                          ? 'cursor-not-allowed text-slate-300'
                          : isHighlighted
                            ? `bg-brand-mist text-brand-blue ${optionButtonBaseClass}`
                            : isSelected
                              ? `bg-slate-100 text-slate-900 ${optionButtonBaseClass}`
                              : `text-slate-700 hover:bg-slate-50 ${optionButtonBaseClass}`
                      }`.trim()}
                      key={`${group.label}-${option.value}`}
                      onClick={() => handleSelect(option)}
                      onMouseEnter={() => {
                        if (!option.disabled) {
                          setHighlightedValue(option.value);
                        }
                      }}
                      role="option"
                      type="button"
                    >
                      <span>{option.label}</span>
                      {isSelected ? <AppIcon className="h-4 w-4" name="check" /> : null}
                    </button>
                  );
                })}
              </div>
            ))
          ) : (
            <p className="px-3 py-4 text-sm text-slate-500">
              {optionGroups.some((group) => group.options.length)
                ? noResultsMessage
                : noOptionsMessage}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
