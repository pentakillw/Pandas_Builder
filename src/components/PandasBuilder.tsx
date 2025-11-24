import React, { useState, useEffect, type ChangeEvent } from 'react';
import { Database, Undo2, Download, Trash } from 'lucide-react';
import type { DataRow, HistoryItem, ColTypes } from '../types';
import Sidebar from './Sidebar';
import OperationModal from './OperationModal';
import { processOperation } from '../utils/dataLogic';

const PandasBuilder: React.FC = () => {
  // --- ESTADO PRINCIPAL ---
  const [data, setData] = useState<DataRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [colTypes, setColTypes] = useState<ColTypes>({});
  const [fileName, setFileName] = useState<string>('ventas_2023.xlsx');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pythonCode, setPythonCode] = useState<string>('');
  
  // Estado de UI
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // --- PERSISTENCIA (LocalStorage) ---
  useEffect(() => {
    const savedData = localStorage.getItem('pandas_data');
    const savedHeaders = localStorage.getItem('pandas_headers');
    const savedHistory = localStorage.getItem('pandas_history');
    const savedFile = localStorage.getItem('pandas_filename');

    if (savedData && savedHeaders) {
      setData(JSON.parse(savedData));
      setHeaders(JSON.parse(savedHeaders));
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      if (savedFile) setFileName(savedFile);
    } else {
      loadInitialData();
    }
  }, []);

  // Guardar cambios cada vez que data o history cambian
  useEffect(() => {
    if (data.length > 0) {
      localStorage.setItem('pandas_data', JSON.stringify(data));
      localStorage.setItem('pandas_headers', JSON.stringify(headers));
      localStorage.setItem('pandas_history', JSON.stringify(history));
      localStorage.setItem('pandas_filename', fileName);
    }
  }, [data, headers, history, fileName]);

  // Generar código y detectar tipos
  useEffect(() => {
    detectTypes();
    generatePythonCode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, history]);

  const loadInitialData = () => {
    const sampleData: DataRow[] = [
      { id: 1, fecha: '2023-01-01', producto: 'Laptop', categoria: 'Tech', venta: 1200, stock: 5 },
      { id: 2, fecha: '2023-01-02', producto: 'Mouse', categoria: 'Accesorios', venta: 25, stock: 50 },
      { id: 3, fecha: '2023-01-03', producto: 'Teclado', categoria: 'Accesorios', venta: 45, stock: 30 },
      { id: 4, fecha: '2023-01-04', producto: 'Monitor', categoria: 'Tech', venta: 300, stock: null },
      { id: 5, fecha: '2023-01-05', producto: 'Silla', categoria: 'Muebles', venta: 150, stock: 0 },
      { id: 6, fecha: '2023-01-06', producto: 'Mesa', categoria: 'Muebles', venta: null, stock: 5 },
    ];
    setData(sampleData);
    setHeaders(Object.keys(sampleData[0]));
    setHistory([]);
    setFileName('demo_data.csv');
  };

  const resetAll = () => {
    if(confirm("¿Estás seguro de borrar todo y volver al inicio?")) {
        localStorage.clear();
        loadInitialData();
    }
  };

  const detectTypes = () => {
    if (data.length === 0) return;
    const types: ColTypes = {};
    headers.forEach(h => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = data.find(r => r[h] !== null && r[h] !== undefined)?.[h] as any;
      if (typeof val === 'number') types[h] = 'num';
      else if (typeof val === 'string' && !isNaN(Date.parse(val)) && val.includes('-')) types[h] = 'date';
      else types[h] = 'str';
    });
    setColTypes(types);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length > 0) {
        const newHeaders = lines[0].split(',').map(h => h.trim());
        const parsedData = lines.slice(1).map((line, idx) => {
          const values = line.split(',');
          const row: DataRow = {};
          newHeaders.forEach((header, i) => {
            const val = values[i]?.trim();
            row[header] = isNaN(Number(val)) ? val : Number(val);
          });
          if (!row.id && !newHeaders.includes('id')) row.id = idx + 1;
          return row;
        });
        setData(parsedData);
        setHeaders(newHeaders);
        setHistory([]);
      }
    };
    reader.readAsText(file);
  };

  // --- EXPORTACIÓN CLIENT-SIDE ---
  const handleExport = (format: 'csv' | 'json') => {
      if (format === 'json') {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `export_${Date.now()}.json`;
          a.click();
      } else {
          // Simple CSV export
          const csvContent = [
              headers.join(','),
              ...data.map(row => headers.map(fieldName => JSON.stringify(row[fieldName] ?? '')).join(','))
          ].join('\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `export_${Date.now()}.csv`;
          a.click();
      }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const executeOperation = (opId: string, params: Record<string, any> = {}) => {
    try {
        // Interceptamos exportaciones que no cambian estado visual pero si descargan
        if (opId === 'export_json') { handleExport('json'); return; }
        if (opId === 'export_xlsx') { handleExport('csv'); return; } // Simulamos xlsx con csv

        // Delegamos la lógica pesada al util
        const result = processOperation(opId, params, data, headers);

        const newHistoryItem: HistoryItem = {
            id: Date.now().toString(),
            type: opId,
            description: result.description,
            codeTemplate: result.codeSnippet,
            timestamp: Date.now(),
            snapshotData: data, // Guardar estado PREVIO para deshacer
            snapshotHeaders: headers
        };

        setHistory([...history, newHistoryItem]);
        setData(result.newData);
        setHeaders(result.newHeaders);
        setActiveModal(null);

    } catch (e) {
      console.error(e);
      alert("Error al ejecutar operación: " + (e as Error).message);
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastItem = history[history.length - 1];
    setData(lastItem.snapshotData);
    setHeaders(lastItem.snapshotHeaders);
    setHistory(history.slice(0, -1));
  };

  const generatePythonCode = () => {
    const imports = `import pandas as pd\nimport matplotlib.pyplot as plt\n\n`;
    const load = `# Cargar dataset\ndf = pd.read_excel('${fileName}')\n\n`;
    const steps = history.map((h, i) => `# Paso ${i + 1}: ${h.description}\n${h.codeTemplate}`).join('\n\n');
    const end = `\n\n# Ver resultados\nprint(df.head())`;
    setPythonCode(imports + load + steps + end);
  };

  const downloadScript = () => {
    const element = document.createElement("a");
    const file = new Blob([pythonCode], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "script_pandas.py";
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <header className="bg-indigo-900 text-white p-4 shadow-lg flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg">
            <Database className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Pandas Builder <span className="text-xs bg-emerald-500 px-2 py-0.5 rounded-full ml-2 text-white/90 font-mono">v9.0 Pro</span></h1>
          </div>
        </div>
        <div className="flex gap-3">
           <button onClick={handleUndo} disabled={history.length === 0} className={`text-xs px-4 py-2 rounded-md flex items-center gap-2 border ${history.length > 0 ? 'bg-indigo-800 hover:bg-indigo-700' : 'opacity-50 cursor-not-allowed'}`}>
             <Undo2 className="w-4 h-4" /> Deshacer
           </button>
           <button onClick={downloadScript} className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md flex items-center gap-2 font-bold border border-emerald-500">
             <Download className="w-4 h-4"/> .py
           </button>
          <button onClick={resetAll} className="text-xs bg-red-900/80 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center gap-2">
            <Trash className="w-3 h-3" /> Reset
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar fileName={fileName} onFileUpload={handleFileUpload} onOperationClick={(id, modal) => modal ? setActiveModal(id) : executeOperation(id)} />

        <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
          <div className="bg-white border-b border-slate-200 px-6 flex gap-6">
            <button onClick={() => setActiveTab('preview')} className={`py-4 text-sm font-bold border-b-2 transition ${activeTab==='preview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Vista de Datos</button>
            <button onClick={() => setActiveTab('code')} className={`py-4 text-sm font-bold border-b-2 transition ${activeTab==='code' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Código Python</button>
          </div>

          <div className="flex-1 overflow-hidden p-6">
            {activeTab === 'preview' ? (
              <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 px-6 flex justify-between text-xs text-slate-500">
                   <span>Filas: <strong>{data.length}</strong></span>
                   <span>Columnas: <strong>{headers.length}</strong></span>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        {headers.map((h, i) => (
                          <th key={i} className="px-6 py-3 font-bold border-b border-slate-200 bg-slate-50">
                            <div className="flex flex-col gap-0.5">
                              <span>{h}</span>
                              <span className="text-[9px] font-mono text-slate-400 lowercase bg-slate-100 px-1 rounded w-fit">{colTypes[h] || '?'}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.map((row, i) => (
                        <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                          {headers.map((h, j) => (
                            <td key={j} className="px-6 py-3 whitespace-nowrap text-slate-600">
                              {row[h] === null || row[h] === undefined ? <span className="text-red-300 italic text-xs">NaN</span> : String(row[h])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="h-full bg-[#0d1117] rounded-xl shadow-lg border border-slate-800 p-6 overflow-auto">
                 <pre className="text-emerald-400 font-mono text-sm">{pythonCode}</pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeModal && (
        <OperationModal 
          activeModal={activeModal} 
          headers={headers} 
          onClose={() => setActiveModal(null)} 
          onExecute={executeOperation} 
        />
      )}
    </div>
  );
};

export default PandasBuilder;