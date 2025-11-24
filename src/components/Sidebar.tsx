import React, { type ChangeEvent } from 'react';
import { FileCode } from 'lucide-react';
import { OPERATION_CATEGORIES, OPERATIONS_CONFIG } from '../constants/operations';

interface SidebarProps {
  fileName: string;
  onFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onOperationClick: (id: string, requiresModal?: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ fileName, onFileUpload, onOperationClick }) => {
  return (
    <div className="w-72 bg-white border-r border-slate-200 flex flex-col overflow-y-auto shadow-inner">
      {/* File Upload Area */}
      <div className="p-4 border-b border-slate-100">
        <div className="p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 transition group text-center">
           <div className="flex justify-center mb-2">
             <FileCode className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition" />
           </div>
           <p className="text-xs font-bold text-slate-600 mb-1">Archivo Actual:</p>
           <p className="text-xs text-indigo-600 font-mono truncate max-w-full mb-3 bg-indigo-50 py-1 px-2 rounded">{fileName}</p>
           <label className="block w-full bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg py-2 cursor-pointer text-xs font-bold transition shadow-sm">
             Subir CSV
             <input type="file" accept=".csv" className="hidden" onChange={onFileUpload} />
           </label>
        </div>
      </div>

      {/* Dynamic Menu */}
      <div className="p-3 space-y-6 pb-10">
        {OPERATION_CATEGORIES.map(cat => (
          <div key={cat.id}>
            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3 px-2 border-b border-slate-100 pb-1">{cat.label}</h4>
            <div className="space-y-1">
              {OPERATIONS_CONFIG.filter(op => op.category === cat.id).map(op => (
                <button
                  key={op.id}
                  onClick={() => onOperationClick(op.id, op.requiresModal)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg text-xs text-slate-600 font-medium transition-all group text-left"
                >
                  <op.icon className={`w-4 h-4 ${op.color || 'text-slate-400'} group-hover:scale-110 transition-transform`} />
                  <span>{op.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;