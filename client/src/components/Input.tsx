import React from 'react';
import clsx from 'clsx';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string | null;
  wrapperClassName?: string;
};

const Input = React.forwardRef<HTMLInputElement, Props>(({ label, error, className, wrapperClassName, placeholder, ...props }, ref) => {
  // Ensure there's at least a single space placeholder so :placeholder-shown works reliably
  const effectivePlaceholder = placeholder === undefined ? ' ' : placeholder;

  return (
    <div className={clsx('form-outline mb-3', wrapperClassName)}>
      <input
        ref={ref}
        {...props}
        placeholder={effectivePlaceholder}
        className={clsx('form-control', className)}
      />
      {label && (
        // keep the label after the input so the sibling selector works: .form-control:focus ~ .form-label
        <label className="form-label" htmlFor={props.id}>
          {label}
        </label>
      )}
      {error && <div className="form-text text-danger mt-1">{error}</div>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
