import React from 'react';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  label?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({ label, error, children, className = '' }) => {
  return (
    <div className={className}>
      {label && <Label className="block mb-1">{label}</Label>}
      {children}
      {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
    </div>
  );
};

export default FormField;
