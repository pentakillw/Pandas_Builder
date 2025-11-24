import { 
  Trash2, Filter, ArrowUpDown, Download, RefreshCw, Layers, Edit3, 
  PlusSquare, Type, Scissors, Calendar, BarChart, Grid, Search, XCircle, 
  TrendingUp, Activity, MoveVertical, Split, Table, Sigma, Dice5, 
  FileJson, ListFilter, Calculator
} from 'lucide-react';
import type { OperationDef } from '../types';

export const OPERATION_CATEGORIES = [
  { id: 'cleaning', label: '1. Limpieza' },
  { id: 'transform', label: '2. Transformación' },
  { id: 'filter_sort', label: '3. Filtrar y Ordenar' },
  { id: 'analysis', label: '4. Análisis' },
  { id: 'timeseries', label: '5. Series de Tiempo' },
  { id: 'export', label: '6. Exportar' },
] as const;

export const OPERATIONS_CONFIG: OperationDef[] = [
  // Limpieza
  { id: 'dropna', label: 'Eliminar Nulos', icon: Trash2, category: 'cleaning', color: 'text-red-500', requiresModal: true },
  { id: 'fillna', label: 'Rellenar Nulos', icon: RefreshCw, category: 'cleaning', color: 'text-orange-500', requiresModal: true },
  { id: 'dedup', label: 'Eliminar Duplicados', icon: Scissors, category: 'cleaning', color: 'text-pink-500', requiresModal: true },
  { id: 'drop_col', label: 'Eliminar Columna', icon: XCircle, category: 'cleaning', color: 'text-red-600', requiresModal: true },
  
  // Transformación
  { id: 'rename', label: 'Renombrar Columna', icon: Edit3, category: 'transform', color: 'text-blue-500', requiresModal: true },
  { id: 'replace', label: 'Reemplazar Valor', icon: Search, category: 'transform', color: 'text-blue-400', requiresModal: true },
  { id: 'calc', label: 'Columna Calculada', icon: PlusSquare, category: 'transform', color: 'text-emerald-600', requiresModal: true },
  { id: 'to_upper', label: 'Texto a Mayúsculas', icon: Type, category: 'transform', color: 'text-indigo-500', requiresModal: true },
  { id: 'split', label: 'Dividir Texto', icon: Split, category: 'transform', color: 'text-indigo-500', requiresModal: true },
  { id: 'binning', label: 'Categorizar (Bins)', icon: Table, category: 'transform', color: 'text-purple-600', requiresModal: true },
  
  // Filtrado y Orden
  { id: 'filter', label: 'Filtrar Básico', icon: Filter, category: 'filter_sort', color: 'text-indigo-500', requiresModal: true },
  { id: 'query', label: 'Query Avanzado', icon: ListFilter, category: 'filter_sort', color: 'text-indigo-600', requiresModal: true },
  { id: 'sort', label: 'Ordenar', icon: ArrowUpDown, category: 'filter_sort', color: 'text-purple-500', requiresModal: true },
  
  // Análisis Estructural
  { id: 'groupby', label: 'Agrupar (GroupBy)', icon: Layers, category: 'analysis', color: 'text-amber-600', requiresModal: true },
  { id: 'pivot', label: 'Tabla Dinámica', icon: Grid, category: 'analysis', color: 'text-orange-600', requiresModal: true },
  { id: 'melt', label: 'Unpivot (Melt)', icon: MoveVertical, category: 'analysis', color: 'text-orange-500', requiresModal: true },
  { id: 'value_counts', label: 'Contar Valores', icon: Sigma, category: 'analysis', color: 'text-purple-600', requiresModal: true },
  { id: 'sample', label: 'Muestreo Aleatorio', icon: Dice5, category: 'analysis', color: 'text-slate-500', requiresModal: true },
  
  // Series de Tiempo y Avanzado
  { id: 'to_datetime', label: 'Convertir a Fecha', icon: Calendar, category: 'timeseries', color: 'text-teal-600', requiresModal: true },
  { id: 'rolling', label: 'Media Móvil', icon: TrendingUp, category: 'timeseries', color: 'text-cyan-600', requiresModal: true },
  { id: 'diff', label: 'Diferencia (Diff)', icon: Activity, category: 'timeseries', color: 'text-cyan-600', requiresModal: true },
  { id: 'cumsum', label: 'Suma Acumulada', icon: Calculator, category: 'timeseries', color: 'text-cyan-700', requiresModal: true },

  // Salida
  { id: 'plot', label: 'Generar Gráfico', icon: BarChart, category: 'export', color: 'text-pink-600', requiresModal: true },
  { id: 'export_xlsx', label: 'Exportar Excel', icon: Download, category: 'export', requiresModal: false },
  { id: 'export_json', label: 'Exportar JSON', icon: FileJson, category: 'export', requiresModal: false },
];