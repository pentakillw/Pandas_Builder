import React, { useState } from 'react';
import { XCircle } from 'lucide-react';
import { OPERATIONS_CONFIG } from '../constants/operations';
import { Select, Input, BtnAction } from './ui/FormElements';

interface OperationModalProps {
  activeModal: string;
  headers: string[];
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onExecute: (opId: string, params: Record<string, any>) => void;
}

const OperationModal: React.FC<OperationModalProps> = ({ activeModal, headers, onClose, onExecute }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [modalParams, setModalParams] = useState<Record<string, any>>({});

  const opDef = OPERATIONS_CONFIG.find(op => op.id === activeModal);
  if (!opDef) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateParam = (key: string, value: any) => {
    setModalParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-96 p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <div className="flex items-center gap-2 text-slate-800">
            <opDef.icon className={`w-5 h-5 ${opDef.color}`} />
            <h3 className="font-bold text-lg">{opDef.label}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          
          {/* --- FORMULARIOS DINÁMICOS --- */}
          
          {/* Selección Simple (Columna) */}
          {['dropna', 'fillna', 'drop_col', 'to_upper', 'to_datetime', 'cumsum', 'diff', 'rolling'].includes(activeModal) && (
            <>
              <Select 
                label={activeModal === 'dropna' ? "Columna (Opcional)" : "Selecciona Columna"}
                options={activeModal === 'dropna' ? ['any', ...headers] : headers} 
                value={modalParams.col || (activeModal === 'dropna' ? 'any' : '')}
                onChange={(v) => updateParam('col', v)} 
              />
              {activeModal === 'fillna' && (
                <Input label="Valor de Relleno" value={modalParams.value || ''} onChange={(v) => updateParam('value', v)} placeholder="0" />
              )}
              {activeModal === 'rolling' && (
                <Input label="Ventana (Filas)" value={modalParams.window || '3'} onChange={(v) => updateParam('window', v)} type="number" />
              )}
            </>
          )}

          {/* Rename */}
          {activeModal === 'rename' && (
            <>
              <Select label="Columna Actual" options={headers} value={modalParams.oldName || ''} onChange={v => updateParam('oldName', v)} />
              <Input label="Nuevo Nombre" value={modalParams.newName || ''} onChange={v => updateParam('newName', v)} placeholder="nombre_limpio" />
            </>
          )}

          {/* Replace */}
          {activeModal === 'replace' && (
            <>
              <Select label="Columna" options={headers} value={modalParams.col || ''} onChange={v => updateParam('col', v)} />
              <Input label="Buscar Valor" value={modalParams.old || ''} onChange={v => updateParam('old', v)} placeholder="valor_viejo" />
              <Input label="Nuevo Valor" value={modalParams.new || ''} onChange={v => updateParam('new', v)} placeholder="valor_nuevo" />
            </>
          )}

          {/* Calc */}
          {activeModal === 'calc' && (
            <>
              <Input label="Nombre Nueva Columna" value={modalParams.newName || ''} onChange={v => updateParam('newName', v)} />
              <div className="flex gap-2">
                <Select label="Col 1" options={headers} value={modalParams.col1 || ''} onChange={v => updateParam('col1', v)} />
                <div className="w-20">
                  <Select label="Op" options={['+', '-', '*', '/']} value={modalParams.op || '+'} onChange={v => updateParam('op', v)} />
                </div>
                <Input label="Col 2 / Valor" value={modalParams.col2 || ''} onChange={v => updateParam('col2', v)} />
              </div>
            </>
          )}

          {/* Filter */}
          {activeModal === 'filter' && (
            <>
              <Select label="Columna" options={headers} value={modalParams.col || ''} onChange={v => updateParam('col', v)} />
              <div className="flex gap-2">
                <Select label="Operador" options={['==', '!=', '>', '<']} value={modalParams.op || '=='} onChange={v => updateParam('op', v)} />
                <Input label="Valor" value={modalParams.val || ''} onChange={v => updateParam('val', v)} />
              </div>
            </>
          )}

          {/* Sort */}
          {activeModal === 'sort' && (
            <>
              <Select label="Columna" options={headers} value={modalParams.col || ''} onChange={v => updateParam('col', v)} />
              <Select label="Orden" options={['asc', 'desc']} value={modalParams.order || 'asc'} onChange={v => updateParam('order', v)} />
            </>
          )}

          {/* GroupBy & Pivot */}
          {activeModal === 'groupby' && (
            <>
              <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">Esto creará una nueva tabla resumida.</div>
              <Select label="Agrupar Por (Columna)" options={headers} value={modalParams.col || ''} onChange={v => updateParam('col', v)} />
              <div className="flex gap-2">
                 <div className="w-1/2">
                    <Select label="Función" options={['sum', 'count', 'mean', 'max', 'min']} value={modalParams.func || 'sum'} onChange={v => updateParam('func', v)} />
                 </div>
                 <div className="w-1/2">
                    <Select label="Columna a Calcular" options={headers} value={modalParams.aggCol || ''} onChange={v => updateParam('aggCol', v)} />
                 </div>
              </div>
            </>
          )}

          {/* Binning */}
          {activeModal === 'binning' && (
            <>
              <Select label="Columna Numérica" options={headers} value={modalParams.col || ''} onChange={v => updateParam('col', v)} />
              <Input label="Cantidad de Grupos" value={modalParams.count || '3'} onChange={v => updateParam('count', v)} type="number" />
            </>
          )}

          {/* Plot */}
          {activeModal === 'plot' && (
            <>
              <Select label="Tipo de Gráfico" options={['bar', 'line', 'scatter', 'hist', 'box']} value={modalParams.kind || 'bar'} onChange={v => updateParam('kind', v)} />
              <div className="flex gap-2">
                <Select label="Eje X" options={headers} value={modalParams.x || ''} onChange={v => updateParam('x', v)} />
                <Select label="Eje Y" options={headers} value={modalParams.y || ''} onChange={v => updateParam('y', v)} />
              </div>
            </>
          )}

          <BtnAction onClick={() => onExecute(activeModal, modalParams)} label={`Aplicar ${opDef.label}`} />
        </div>
      </div>
    </div>
  );
};

export default OperationModal;