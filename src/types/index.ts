import type { LucideIcon } from 'lucide-react';

export type CellValue = string | number | boolean | null | undefined;

export interface DataRow {
  [key: string]: CellValue;
}

export interface HistoryItem {
  id: string;
  type: string;
  description: string;
  codeTemplate: string;
  timestamp: number;
  snapshotData: DataRow[];
  snapshotHeaders: string[];
}

export interface ColTypes {
  [key: string]: 'num' | 'str' | 'date';
}

export type OperationCategory = 'cleaning' | 'transform' | 'filter_sort' | 'analysis' | 'timeseries' | 'export';

export interface OperationDef {
  id: string;
  label: string;
  icon: LucideIcon | React.ElementType;
  category: OperationCategory;
  color?: string;
  requiresModal?: boolean;
}