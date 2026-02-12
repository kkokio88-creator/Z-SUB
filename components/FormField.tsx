import React from 'react';

interface FormFieldProps {
  label?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({ label, error, children, className = '' }) => {
  return (
    <div className={className}>
      {label && <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>}
      {children}
      {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
    </div>
  );
};

export default FormField;
