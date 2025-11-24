import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SelectProps {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}

export const Select: React.FC<SelectProps> = ({ label, options, value, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>
    <div className="relative">
      <select 
        className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 pr-8" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>Seleccionar...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
      </div>
    </div>
  </div>
);

interface InputProps {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
}

export const Input: React.FC<InputProps> = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div className="flex-1">
    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>
    <input 
      type={type} 
      className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5" 
      placeholder={placeholder} 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
    />
  </div>
);

interface BtnActionProps {
  onClick: () => void;
  label: string;
}

export const BtnAction: React.FC<BtnActionProps> = ({ onClick, label }) => (
  <button 
    onClick={onClick}
    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition flex justify-center items-center gap-2"
  >
    <CheckCircle2 className="w-5 h-5" />
    {label}
  </button>
);