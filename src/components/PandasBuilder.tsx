import React, { useState, useEffect, useMemo, type ChangeEvent, type ElementType } from 'react';
import { 
  Database, Undo2, Download, Trash, FileCode, CheckCircle2, 
  Trash2, Filter, ArrowUpDown, RefreshCw, Layers, Edit3, 
  PlusSquare, Type, Scissors, Calendar, Grid, Search, 
  XCircle, TrendingUp, Activity, MoveVertical, Split, Table as TableIcon, 
  Dice5, Calculator, ChevronLeft, ChevronRight, AlertCircle, X, Save
} from 'lucide-react';

// --- TIPOS E INTERFACES STRICTOS ---

type CellValue = string | number | boolean | null | undefined;
type RowData = Record<string, CellValue>;

// Definición estricta de parámetros para evitar 'any'
type ParamValue = string | number;
type OperationParams = Record<string, ParamValue>;

interface OperationLog {
  id: string;
  type: string;
  description: string;
  code: string;
  timestamp: number;
}

interface HistoryState {
  data: RowData[];
  headers: string[];
  logs: OperationLog[];
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  className?: string;
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: string[];
}

// Configuración de los formularios dinámicos
interface FieldDef {
  name: string;
  type: 'select' | 'text' | 'number';
  label: string;
  opts?: string[];
}

interface OpDef {
  title: string;
  icon: ElementType;
  fields: FieldDef[];
}

// --- UTILIDADES ---

const parseCSV = (text: string): { headers: string[], data: RowData[] } => {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return { headers: [], data: [] };

  const splitLine = (line: string) => {
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!matches) return line.split(','); 
    return matches.map(m => m.replace(/^"|"$/g, '').trim());
  };

  const headers = splitLine(lines[0]);
  
  const data = lines.slice(1).map((line, idx) => {
    const values = splitLine(line);
    const row: RowData = { _id: idx + 1 }; 
    headers.forEach((h, i) => {
      const val = values[i];
      const numVal = Number(val);
      // Lógica segura para detectar números vs strings
      const isNum = !isNaN(numVal) && val !== '' && val !== null && val !== undefined;
      row[h] = (val === '' || val === undefined) ? null : (isNum ? numVal : val);
    });
    return row;
  });

  return { headers, data };
};

const generatePythonScript = (fileName: string, logs: OperationLog[]) => {
  const imports = `import pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt\n\n`;
  const load = `# Cargar dataset\ntry:\n    df = pd.read_csv('${fileName}')\nexcept:\n    df = pd.read_excel('${fileName.replace('.csv', '.xlsx')}')\n\n`;
  const steps = logs.map((log, i) => `# Paso ${i + 1}: ${log.description}\n${log.code}`).join('\n\n');
  const end = `\n\n# Resultado final\nprint(df.head())\nprint(df.info())`;
  return imports + load + steps + end;
};

// --- COMPONENTES UI BÁSICOS ---

const Button: React.FC<ButtonProps> = ({ onClick, children, variant = 'primary', className = '', disabled = false, ...props }) => {
  const baseClass = "px-4 py-2 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-indigo-300",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100 border-transparent shadow-none"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClass} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="mb-3">
    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">{label}</label>
    <input 
      className={`w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${className}`}
      {...props}
    />
  </div>
);

const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => (
  <div className="mb-3">
    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">{label}</label>
    <div className="relative">
      <select 
        className={`w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none ${className}`}
        {...props}
      >
        <option value="" disabled>Seleccionar...</option>
        {options.map((op) => <option key={op} value={op}>{op}</option>)}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
      </div>
    </div>
  </div>
);

// --- MODALES ---

interface OperationModalProps {
  opId: string;
  headers: string[];
  onClose: () => void;
  onExecute: (opId: string, params: OperationParams) => void;
}

const OperationModal: React.FC<OperationModalProps> = ({ opId, headers, onClose, onExecute }) => {
  const [params, setParams] = useState<OperationParams>({});
  
  // Configuración tipada correctamente
  const config: Record<string, OpDef> = {
    // Limpieza
    dropna: { title: "Eliminar Nulos", icon: Trash2, fields: [{ name: 'col', type: 'select', label: 'Columna (Opcional)', opts: ['any', ...headers] }] },
    fillna: { title: "Rellenar Nulos", icon: RefreshCw, fields: [{ name: 'col', type: 'select', label: 'Columna', opts: headers }, { name: 'value', type: 'text', label: 'Valor de Relleno' }] },
    drop_col: { title: "Eliminar Columna", icon: XCircle, fields: [{ name: 'col', type: 'select', label: 'Columna a eliminar', opts: headers }] },
    
    // Transformación
    rename: { title: "Renombrar Columna", icon: Edit3, fields: [{ name: 'oldName', type: 'select', label: 'Columna Actual', opts: headers }, { name: 'newName', type: 'text', label: 'Nuevo Nombre' }] },
    replace: { title: "Reemplazar Valor", icon: Search, fields: [{ name: 'col', type: 'select', label: 'Columna', opts: headers }, { name: 'old', type: 'text', label: 'Valor a buscar' }, { name: 'new', type: 'text', label: 'Valor nuevo' }] },
    calc: { title: "Cálculo Numérico", icon: Calculator, fields: [{ name: 'newName', type: 'text', label: 'Nombre Columna Resultado' }, { name: 'col1', type: 'select', label: 'Columna 1', opts: headers }, { name: 'op', type: 'select', label: 'Operación', opts: ['+', '-', '*', '/'] }, { name: 'col2', type: 'text', label: 'Columna 2 (o valor numérico)' }] },
    to_upper: { title: "A Mayúsculas", icon: Type, fields: [{ name: 'col', type: 'select', label: 'Columna de Texto', opts: headers }] },
    split: { title: "Dividir Texto", icon: Split, fields: [{ name: 'col', type: 'select', label: 'Columna a dividir', opts: headers }, { name: 'delim', type: 'text', label: 'Delimitador (ej: espacio, guion)' }] },
    binning: { title: "Crear Rangos (Bins)", icon: TableIcon, fields: [{ name: 'col', type: 'select', label: 'Columna Numérica', opts: headers }, { name: 'count', type: 'number', label: 'Cantidad de Grupos' }] },

    // Análisis
    filter: { title: "Filtrar Filas", icon: Filter, fields: [{ name: 'col', type: 'select', label: 'Columna', opts: headers }, { name: 'op', type: 'select', label: 'Operador', opts: ['==', '!=', '>', '<', '>=', '<='] }, { name: 'val', type: 'text', label: 'Valor' }] },
    sort: { title: "Ordenar Datos", icon: ArrowUpDown, fields: [{ name: 'col', type: 'select', label: 'Columna', opts: headers }, { name: 'order', type: 'select', label: 'Dirección', opts: ['asc', 'desc'] }] },
    groupby: { title: "Agrupar (GroupBy)", icon: Layers, fields: [{ name: 'col', type: 'select', label: 'Agrupar Por', opts: headers }, { name: 'aggCol', type: 'select', label: 'Columna a Calcular', opts: headers }, { name: 'func', type: 'select', label: 'Función', opts: ['sum', 'mean', 'count', 'max', 'min'] }] },
    pivot: { title: "Tabla Dinámica (Pivot)", icon: Grid, fields: [{ name: 'index', type: 'select', label: 'Índice (Filas)', opts: headers }, { name: 'columns', type: 'select', label: 'Columnas', opts: headers }, { name: 'values', type: 'select', label: 'Valores', opts: headers }, { name: 'func', type: 'select', label: 'Función', opts: ['sum', 'mean', 'count'] }] },
    melt: { title: "Unpivot (Melt)", icon: MoveVertical, fields: [{ name: 'id_vars', type: 'select', label: 'Columna Identificadora (ID)', opts: headers }] },
    sample: { title: "Muestreo Aleatorio", icon: Dice5, fields: [{ name: 'n', type: 'number', label: 'Número de filas' }] },

    // Series de Tiempo
    to_datetime: { title: "Convertir a Fecha", icon: Calendar, fields: [{ name: 'col', type: 'select', label: 'Columna', opts: headers }] },
    rolling: { title: "Media Móvil (Rolling)", icon: TrendingUp, fields: [{ name: 'col', type: 'select', label: 'Columna Numérica', opts: headers }, { name: 'window', type: 'number', label: 'Ventana (filas)' }] },
    diff: { title: "Diferencia (Diff)", icon: Activity, fields: [{ name: 'col', type: 'select', label: 'Columna', opts: headers }] },
    cumsum: { title: "Suma Acumulada", icon: PlusSquare, fields: [{ name: 'col', type: 'select', label: 'Columna', opts: headers }] },
  };

  const def = config[opId];
  if (!def) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-indigo-900 font-bold">
            <def.icon className="w-5 h-5 text-indigo-600" />
            <h3>{def.title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {def.fields.map((field) => (
            <div key={field.name}>
              {field.type === 'select' ? (
                <Select 
                    label={field.label} 
                    options={field.opts || []} 
                    value={String(params[field.name] || '')} 
                    onChange={(e) => setParams({...params, [field.name]: e.target.value})} 
                />
              ) : (
                <Input 
                    label={field.label} 
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={String(params[field.name] || '')} 
                    onChange={(e) => setParams({...params, [field.name]: e.target.value})} 
                />
              )}
            </div>
          ))}
          
          <Button onClick={() => onExecute(opId, params)} className="w-full justify-center mt-4 py-3">
            Aplicar Operación
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---

export default function PandasBuilder() {
  // Estado Principal
  const [data, setData] = useState<RowData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [fileName, setFileName] = useState("ventas_2023.csv");
  
  // Estado de Historial (Undo)
  const [historyStack, setHistoryStack] = useState<HistoryState[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [modalOp, setModalOp] = useState<string | null>(null);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  // Carga inicial (Restaurada la data original de ejemplo)
  useEffect(() => {
    const initData: RowData[] = [
      { _id: 1, fecha: '2023-01-01', producto: 'Laptop', categoria: 'Tech', venta: 1200, stock: 5 },
      { _id: 2, fecha: '2023-01-02', producto: 'Mouse', categoria: 'Accesorios', venta: 25, stock: 50 },
      { _id: 3, fecha: '2023-01-03', producto: 'Teclado', categoria: 'Accesorios', venta: 45, stock: 30 },
      { _id: 4, fecha: '2023-01-04', producto: 'Monitor', categoria: 'Tech', venta: 300, stock: null },
      { _id: 5, fecha: '2023-01-05', producto: 'Silla', categoria: 'Muebles', venta: 150, stock: 0 },
      { _id: 6, fecha: '2023-01-06', producto: 'Mesa', categoria: 'Muebles', venta: null, stock: 5 },
    ];
    setData(initData);
    setHeaders(Object.keys(initData[0]).filter(k => k !== '_id'));
  }, []);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const saveToHistory = () => {
    setHistoryStack(prev => [...prev.slice(-10), { data: [...data], headers: [...headers], logs: [...logs] }]);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const last = historyStack[historyStack.length - 1];
    setData(last.data);
    setHeaders(last.headers);
    setLogs(last.logs);
    setHistoryStack(prev => prev.slice(0, -1));
    showNotify("Acción deshecha", "success");
  };

  const showNotify = (msg: string, type: 'success' | 'error') => setNotification({ msg, type });

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const { headers: newHeaders, data: newData } = parseCSV(text);
        if (newHeaders.length > 0) {
          saveToHistory();
          setHeaders(newHeaders);
          setData(newData);
          setLogs([]); 
          showNotify(`Archivo cargado: ${newData.length} filas`, 'success');
        } else {
            showNotify("El archivo parece vacío o inválido", "error");
        }
      } catch (err) {
        showNotify("Error al procesar el CSV", "error");
      }
    };
    reader.readAsText(file);
  };

  // --- MOTOR PANDAS ---
  const executeOperation = (opId: string, params: OperationParams) => {
    saveToHistory();
    let newData = [...data];
    let newHeaders = [...headers];
    let code = "";
    let desc = "";

    try {
      switch (opId) {
        // --- LIMPIEZA ---
        case 'dropna': {
          const col = String(params.col || 'any');
          desc = `Eliminar nulos (${col === 'any' ? 'cualquier columna' : col})`;
          code = col === 'any' ? `df = df.dropna()` : `df = df.dropna(subset=['${col}'])`;
          newData = newData.filter(row => col === 'any' 
            ? Object.values(row).every(v => v !== null && v !== '')
            : row[col] !== null && row[col] !== ''
          );
          break;
        }

        case 'fillna': {
          const col = String(params.col);
          const val = params.value;
          desc = `Rellenar nulos en ${col} con '${val}'`;
          const valStr = isNaN(Number(val)) ? `'${val}'` : val;
          code = `df['${col}'] = df['${col}'].fillna(${valStr})`;
          newData = newData.map(r => ({
            ...r,
            [col]: (r[col] === null || r[col] === '') ? val : r[col]
          }));
          break;
        }

        case 'drop_col': {
          const col = String(params.col);
          desc = `Eliminar columna ${col}`;
          code = `df = df.drop(columns=['${col}'])`;
          newHeaders = newHeaders.filter(h => h !== col);
          newData = newData.map(r => {
              const copy = { ...r };
              delete copy[col];
              return copy;
          });
          break;
        }

        case 'dedup': {
          desc = "Eliminar duplicados";
          code = `df = df.drop_duplicates()`;
          const seen = new Set();
          newData = newData.filter(r => {
              // Convertimos a string pero ignoramos la key interna _id para el duplicado
              const content = { ...r };
              delete content._id;
              const fingerprint = JSON.stringify(content); 
              return seen.has(fingerprint) ? false : seen.add(fingerprint);
          });
          break;
        }

        // --- TRANSFORMACIÓN ---
        case 'rename': {
          const oldName = String(params.oldName);
          const newName = String(params.newName);
          desc = `Renombrar ${oldName} a ${newName}`;
          code = `df = df.rename(columns={'${oldName}': '${newName}'})`;
          newHeaders = newHeaders.map(h => h === oldName ? newName : h);
          newData = newData.map(r => {
              const copy = { ...r, [newName]: r[oldName] };
              delete copy[oldName];
              return copy;
          });
          break;
        }

        case 'replace': {
            const col = String(params.col);
            const oldVal = String(params.old);
            const newVal = params.new;
            desc = `Reemplazar '${oldVal}' por '${newVal}' en ${col}`;
            code = `df['${col}'] = df['${col}'].replace('${oldVal}', '${newVal}')`;
            newData = newData.map(r => ({
                ...r,
                [col]: String(r[col]) === oldVal ? newVal : r[col]
            }));
            break;
        }

        case 'to_upper': {
            const col = String(params.col);
            desc = `Mayúsculas en ${col}`;
            code = `df['${col}'] = df['${col}'].str.upper()`;
            newData = newData.map(r => ({
                ...r,
                [col]: String(r[col] || '').toUpperCase()
            }));
            break;
        }

        case 'split': {
            const col = String(params.col);
            const delim = String(params.delim || ' ');
            desc = `Dividir ${col} por '${delim}'`;
            code = `df[['${col}_1', '${col}_2']] = df['${col}'].str.split('${delim}', expand=True)`;
            if (!newHeaders.includes(`${col}_1`)) newHeaders.push(`${col}_1`, `${col}_2`);
            newData = newData.map(r => {
                const parts = String(r[col] || '').split(delim);
                return { ...r, [`${col}_1`]: parts[0] || '', [`${col}_2`]: parts[1] || '' };
            });
            break;
        }

        case 'calc': {
          const newName = String(params.newName);
          const col1 = String(params.col1);
          const col2 = params.col2; // Puede ser string (nombre columna) o numero
          const op = String(params.op);
          
          desc = `${newName} = ${col1} ${op} ${col2}`;
          code = `df['${newName}'] = df['${col1}'] ${op} df['${col2}']`;
          if (!newHeaders.includes(newName)) newHeaders.push(newName);
          
          newData = newData.map(r => {
              const v1 = Number(r[col1] || 0);
              const isCol = headers.includes(String(col2));
              const v2 = isCol ? Number(r[String(col2)] || 0) : Number(col2);
              
              let res = 0;
              if(op === '+') res = v1 + v2;
              if(op === '-') res = v1 - v2;
              if(op === '*') res = v1 * v2;
              if(op === '/') res = v2 !== 0 ? v1 / v2 : 0;
              return { ...r, [newName]: parseFloat(res.toFixed(2)) };
          });
          break;
        }

        case 'binning': {
           const col = String(params.col);
           const count = Number(params.count);
           desc = `Bins en ${col} (${count} grupos)`;
           code = `df['${col}_cat'] = pd.cut(df['${col}'], bins=${count})`;
           const newColBin = `${col}_cat`;
           const vals = newData.map(r => Number(r[col])).filter(n => !isNaN(n));
           
           if (vals.length > 0) {
                const min = Math.min(...vals);
                const max = Math.max(...vals);
                const step = (max - min) / count;
                
                if (!newHeaders.includes(newColBin)) newHeaders.push(newColBin);
                newData = newData.map(r => {
                    const v = Number(r[col]);
                    if(isNaN(v)) return { ...r, [newColBin]: 'NaN' };
                    let bIdx = Math.floor((v - min) / step);
                    if(bIdx >= count) bIdx = count - 1;
                    return { ...r, [newColBin]: `Bin ${bIdx + 1}` };
                });
           }
           break;
        }

        // --- ANÁLISIS ---
        case 'filter': {
          const col = String(params.col);
          const op = String(params.op);
          const val = params.val;
          
          desc = `Filtrar donde ${col} ${op} ${val}`;
          code = `df = df[df['${col}'] ${op} '${val}']`;
          newData = newData.filter(r => {
            const rowVal = r[col];
            const compVal = val;
            // eslint-disable-next-line eqeqeq
            if (op === '==') return rowVal == compVal;
            // eslint-disable-next-line eqeqeq
            if (op === '!=') return rowVal != compVal;
            if (op === '>') return Number(rowVal) > Number(compVal);
            if (op === '<') return Number(rowVal) < Number(compVal);
            if (op === '>=') return Number(rowVal) >= Number(compVal);
            if (op === '<=') return Number(rowVal) <= Number(compVal);
            return true;
          });
          break;
        }
        
        case 'sort': {
          const col = String(params.col);
          const order = String(params.order);
          desc = `Ordenar por ${col} (${order})`;
          code = `df = df.sort_values(by='${col}', ascending=${order === 'asc'})`;
          
          newData.sort((a, b) => {
              // Cast seguro para ordenamiento
              const vA = a[col] ?? '';
              const vB = b[col] ?? '';
              
              if (vA < vB) return order === 'asc' ? -1 : 1;
              if (vA > vB) return order === 'asc' ? 1 : -1;
              return 0;
          });
          break;
        }

        case 'groupby': {
          const col = String(params.col);
          const aggCol = String(params.aggCol);
          const func = String(params.func);
          
          desc = `Agrupar por ${col} (${func} de ${aggCol})`;
          code = `df = df.groupby('${col}')['${aggCol}'].${func}().reset_index()`;
          
          const groups: Record<string, number[]> = {};
          newData.forEach(r => {
              const k = String(r[col]);
              if(!groups[k]) groups[k] = [];
              const val = Number(r[aggCol]);
              if (!isNaN(val)) groups[k].push(val);
          });
          
          newData = Object.keys(groups).map((k, i) => {
              const vals = groups[k];
              let res = 0;
              if(func === 'sum') res = vals.reduce((a,b)=>a+b,0);
              if(func === 'mean') res = vals.length ? vals.reduce((a,b)=>a+b,0) / vals.length : 0;
              if(func === 'max') res = vals.length ? Math.max(...vals) : 0;
              if(func === 'min') res = vals.length ? Math.min(...vals) : 0;
              if(func === 'count') res = vals.length;
              return { _id: i+1, [col]: k, [aggCol]: parseFloat(res.toFixed(2)) };
          });
          newHeaders = [col, aggCol];
          break;
        }

        case 'sample': {
            const n = Number(params.n || 5);
            desc = `Muestra aleatoria de ${n} filas`;
            code = `df = df.sample(n=${n})`;
            newData = [...newData].sort(() => 0.5 - Math.random()).slice(0, n);
            break;
        }

        case 'melt': {
            const id_vars = String(params.id_vars);
            desc = `Unpivot (Melt) manteniendo ${id_vars}`;
            code = `df = df.melt(id_vars=['${id_vars}'])`;
            const valVars = headers.filter(h => h !== id_vars && h !== '_id');
            const meltedRows: RowData[] = [];
            newData.forEach((r, idx) => {
                valVars.forEach(v => {
                    meltedRows.push({
                        _id: `${idx}-${v}`,
                        [id_vars]: r[id_vars],
                        variable: v,
                        value: r[v]
                    });
                });
            });
            newData = meltedRows;
            newHeaders = [id_vars, 'variable', 'value'];
            break;
        }

        // --- SERIES DE TIEMPO ---
        case 'rolling': {
            const col = String(params.col);
            const win = Number(params.window || 3);
            const rollCol = `${col}_ma_${win}`;
            desc = `Media Móvil (${win}) de ${col}`;
            code = `df['${rollCol}'] = df['${col}'].rolling(${win}).mean()`;
            newData = newData.map((r, i, arr) => {
                if (i < win - 1) return { ...r, [rollCol]: null };
                const slice = arr.slice(i - win + 1, i + 1);
                const avg = slice.reduce((sum, item) => sum + Number(item[col] || 0), 0) / win;
                return { ...r, [rollCol]: parseFloat(avg.toFixed(2)) };
            });
            if(!newHeaders.includes(rollCol)) newHeaders.push(rollCol);
            break;
        }

        case 'cumsum': {
            const col = String(params.col);
            const cumCol = `${col}_cumsum`;
            desc = `Suma Acumulada de ${col}`;
            code = `df['${cumCol}'] = df['${col}'].cumsum()`;
            let acc = 0;
            newData = newData.map(r => {
                acc += Number(r[col] || 0);
                return { ...r, [cumCol]: acc };
            });
            if(!newHeaders.includes(cumCol)) newHeaders.push(cumCol);
            break;
        }

        case 'diff': {
            const col = String(params.col);
            const diffCol = `${col}_diff`;
            desc = `Diferencia de ${col}`;
            code = `df['${diffCol}'] = df['${col}'].diff()`;
            newData = newData.map((r, i, arr) => {
                const prev = i > 0 ? Number(arr[i-1][col] || 0) : 0;
                const curr = Number(r[col] || 0);
                return { ...r, [diffCol]: i === 0 ? null : curr - prev };
            });
            if(!newHeaders.includes(diffCol)) newHeaders.push(diffCol);
            break;
        }

        default:
          showNotify("Operación no implementada en demo", "error");
          return;
      }

      setData(newData);
      setHeaders(newHeaders);
      setLogs([...logs, { id: Date.now().toString(), type: opId, description: desc, code, timestamp: Date.now() }]);
      setModalOp(null);
      showNotify("Operación exitosa", "success");
      setCurrentPage(1);

    } catch (e) {
      console.error(e);
      showNotify("Error al ejecutar operación", "error");
    }
  };

  // --- RENDER ---

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }, [data, currentPage]);

  const totalPages = Math.ceil(data.length / rowsPerPage);

  const pythonCode = useMemo(() => generatePythonScript(fileName, logs), [fileName, logs]);

  const downloadFile = (content: string, name: string, type = 'text/plain') => {
      const blob = new Blob([content], {type});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
  };

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-lg z-10 shrink-0">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
                <Database size={20} />
            </div>
            <h1 className="font-bold text-slate-800 text-xl tracking-tight">Pandas Builder</h1>
          </div>
          <p className="text-[11px] text-slate-400 font-bold pl-1 uppercase tracking-wider">v4.0 • Zero Errors</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            
            {/* File Uploader */}
            <div className="mb-8 p-4 bg-indigo-50 rounded-xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 transition group text-center">
                <p className="text-xs text-indigo-800 font-bold mb-2 truncate bg-white py-1 px-2 rounded shadow-sm border border-indigo-100" title={fileName}>{fileName}</p>
                <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-md block transition transform group-hover:scale-105">
                    Subir CSV / Excel
                    <input type="file" accept=".csv,.txt,.xlsx" className="hidden" onChange={handleFileUpload} />
                </label>
            </div>

            {/* Menu Categorizado */}
            <div className="space-y-6 pb-10">
                {[
                    { id: 'clean', label: "Limpieza de Datos", items: [
                        { id: 'dropna', label: 'Eliminar Nulos', icon: Trash2, color: 'text-red-500' },
                        { id: 'fillna', label: 'Rellenar Nulos', icon: RefreshCw, color: 'text-orange-500' },
                        { id: 'dedup', label: 'Quitar Duplicados', icon: Scissors, color: 'text-pink-500', direct: true },
                        { id: 'drop_col', label: 'Eliminar Columna', icon: XCircle, color: 'text-red-400' },
                    ]},
                    { id: 'trans', label: "Transformación", items: [
                        { id: 'rename', label: 'Renombrar', icon: Edit3, color: 'text-blue-500' },
                        { id: 'replace', label: 'Reemplazar Valor', icon: Search, color: 'text-cyan-600' },
                        { id: 'calc', label: 'Columna Calculada', icon: Calculator, color: 'text-emerald-600' },
                        { id: 'to_upper', label: 'Texto a Mayúsculas', icon: Type, color: 'text-indigo-500' },
                        { id: 'split', label: 'Dividir Texto', icon: Split, color: 'text-violet-500' },
                        { id: 'binning', label: 'Crear Rangos', icon: TableIcon, color: 'text-purple-600' }
                    ]},
                    { id: 'anal', label: "Análisis & Estructura", items: [
                        { id: 'filter', label: 'Filtrar Datos', icon: Filter, color: 'text-indigo-600' },
                        { id: 'sort', label: 'Ordenar', icon: ArrowUpDown, color: 'text-violet-600' },
                        { id: 'groupby', label: 'Agrupar (GroupBy)', icon: Layers, color: 'text-amber-600' },
                        { id: 'pivot', label: 'Tabla Pivote', icon: Grid, color: 'text-orange-600' },
                        { id: 'melt', label: 'Unpivot (Melt)', icon: MoveVertical, color: 'text-orange-500' },
                        { id: 'sample', label: 'Muestreo Aleatorio', icon: Dice5, color: 'text-slate-500' },
                    ]},
                    { id: 'time', label: "Series de Tiempo", items: [
                        { id: 'to_datetime', label: 'Convertir a Fecha', icon: Calendar, color: 'text-teal-600' }, 
                        { id: 'rolling', label: 'Media Móvil', icon: TrendingUp, color: 'text-cyan-600' },
                        { id: 'diff', label: 'Diferencia', icon: Activity, color: 'text-cyan-600' },
                        { id: 'cumsum', label: 'Acumulado', icon: PlusSquare, color: 'text-cyan-700' },
                    ]}
                ].map((section) => (
                    <div key={section.id}>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                             {section.label}
                        </h3>
                        <div className="space-y-1">
                            {section.items.map((item: any) => (
                                <button
                                    key={item.id}
                                    onClick={() => item.direct ? executeOperation(item.id, {}) : setModalOp(item.id)}
                                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-700 rounded-lg transition-all group border border-transparent hover:border-slate-200"
                                >
                                    <item.icon size={15} className={`${item.color} group-hover:scale-110 transition-transform`} />
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 grid grid-cols-2 gap-3">
            <button 
                onClick={handleUndo} 
                disabled={historyStack.length === 0}
                className="flex items-center justify-center gap-2 bg-white border border-slate-300 shadow-sm text-slate-700 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
                <Undo2 size={14} /> Deshacer
            </button>
            <button 
                onClick={() => { if(confirm("¿Borrar todo?")) { setData([]); setLogs([]); } }}
                className="flex items-center justify-center gap-2 bg-white border border-slate-300 shadow-sm text-red-600 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition"
            >
                <Trash size={14} /> Reset
            </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-100">
        
        {/* Header Tabs */}
        <header className="bg-white border-b border-slate-200 px-8 flex items-center justify-between h-16 shrink-0 shadow-sm z-20">
           <div className="flex gap-8 h-full">
               <button 
                onClick={() => setActiveTab('preview')}
                className={`h-full border-b-[3px] text-sm font-bold flex items-center gap-2 transition px-1 ${activeTab === 'preview' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
               >
                 <TableIcon size={16} /> Vista de Datos
               </button>
               <button 
                onClick={() => setActiveTab('code')}
                className={`h-full border-b-[3px] text-sm font-bold flex items-center gap-2 transition px-1 ${activeTab === 'code' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
               >
                 <FileCode size={16} /> Script Generado
               </button>
           </div>
           
           <div className="flex gap-3">
               <button 
                 onClick={() => downloadFile(headers.join(',') + '\n' + data.map(r => headers.map(h => r[h]).join(',')).join('\n'), 'data_export.csv')}
                 className="text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 shadow-sm"
               >
                   <Save size={16} /> Exportar CSV
               </button>
               <button 
                 onClick={() => downloadFile(pythonCode, 'pandas_script.py')}
                 className="text-xs bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 shadow-sm"
               >
                   <Download size={16} /> Descargar .py
               </button>
           </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-8 relative">
           
           {/* Vista de Datos */}
           {activeTab === 'preview' && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full animate-in fade-in zoom-in duration-300 overflow-hidden">
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs text-slate-500">
                    <span className="font-semibold">Mostrando {paginatedData.length} de {data.length} filas</span>
                    <span className="font-mono bg-slate-200 text-slate-600 px-2 py-1 rounded font-bold">{headers.length} columnas</span>
                </div>
                
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-bold sticky top-0 z-10 shadow-sm">
                            <tr>
                                {headers.map(h => (
                                    <th key={h} className="px-6 py-3 border-b border-slate-200 whitespace-nowrap bg-slate-50">
                                        <div className="flex items-center gap-1 cursor-pointer hover:text-indigo-600">
                                            {h}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedData.map((row, i) => (
                                <tr key={String(row._id) || i} className="hover:bg-indigo-50/40 transition-colors group">
                                    {headers.map((h, j) => (
                                        <td key={`${i}-${j}`} className="px-6 py-3 whitespace-nowrap text-slate-600 max-w-[200px] truncate group-hover:text-slate-900" title={String(row[h])}>
                                            {row[h] === null || row[h] === undefined ? <span className="text-red-300 italic text-[10px]">NaN</span> : String(row[h])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                            <div className="bg-slate-50 p-6 rounded-full">
                                <Database className="w-12 h-12 opacity-20" />
                            </div>
                            <p className="font-medium">No hay datos cargados</p>
                        </div>
                    )}
                </div>

                {/* Footer de Paginación */}
                {data.length > 0 && (
                    <div className="border-t border-slate-200 p-3 flex justify-between items-center bg-slate-50">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p-1))}
                            className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 disabled:opacity-30 transition"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-xs font-bold text-slate-600">Página {currentPage} de {totalPages}</span>
                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
                            className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 disabled:opacity-30 transition"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}
             </div>
           )}

           {/* Vista de Código */}
           {activeTab === 'code' && (
               <div className="bg-[#1e1e1e] rounded-xl shadow-lg border border-slate-800 h-full overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
                   <div className="flex items-center gap-2 px-4 py-3 bg-[#252526] border-b border-white/5 text-xs text-slate-400">
                       <div className="flex gap-1.5 mr-2">
                           <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition"></div>
                           <div className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 transition"></div>
                           <div className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition"></div>
                       </div>
                       <FileCode size={14} />
                       <span className="font-mono">script_generado.py</span>
                   </div>
                   <div className="flex-1 overflow-auto p-6 custom-scrollbar">
                       <pre className="font-mono text-sm leading-relaxed">
                           <code className="language-python text-emerald-300/90">{pythonCode}</code>
                       </pre>
                   </div>
               </div>
           )}

           {/* Notificaciones Toast */}
           {notification && (
               <div className={`absolute bottom-8 right-8 px-5 py-3 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 z-50 ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                   {notification.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-red-500" />}
                   <span className="text-sm font-bold">{notification.msg}</span>
               </div>
           )}

        </div>
      </main>

      {/* Modal Render */}
      {modalOp && (
          <OperationModal 
            opId={modalOp} 
            headers={headers} 
            onClose={() => setModalOp(null)} 
            onExecute={executeOperation} 
          />
      )}

    </div>
  );
}