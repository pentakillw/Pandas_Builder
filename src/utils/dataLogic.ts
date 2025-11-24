import type { DataRow, CellValue } from '../types';

// Helper para comparaciones seguras sin usar 'any'
const safeCompare = (a: CellValue, b: CellValue, op: string): boolean => {
  const numA = Number(a);
  const numB = Number(b);
  
  // Verificamos si ambos son números válidos y no son cadenas vacías ni nulos
  const isNumA = !isNaN(numA) && a !== null && a !== '' && a !== undefined;
  const isNumB = !isNaN(numB) && b !== null && b !== '' && b !== undefined;
  
  const useNum = isNumA && isNumB;
  
  // Si son números usamos la versión numérica, si no, la original
  const valA = useNum ? numA : a;
  const valB = useNum ? numB : b;

  // Para comparaciones >, <, >=, <= con tipos mixtos, TypeScript puede quejarse.
  // Forzamos la comparación asumiendo que si no son números, son comparables como strings.
  
  switch (op) {
    case '==': return valA == valB;
    case '!=': return valA != valB;
    case '>': return (valA as string | number) > (valB as string | number);
    case '<': return (valA as string | number) < (valB as string | number);
    default: return false;
  }
};

interface OperationResult {
  newData: DataRow[];
  newHeaders: string[];
  codeSnippet: string;
  description: string;
}

export const processOperation = (
  opId: string, 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>, 
  currentData: DataRow[], 
  currentHeaders: string[]
): OperationResult => {
  let newData = [...currentData];
  let newHeaders = [...currentHeaders];
  let codeSnippet = '';
  let description = '';

  switch (opId) {
    // --- LIMPIEZA ---
    case 'dropna': {
      const col = params.col || 'any';
      description = col === 'any' ? 'Eliminar filas con nulos' : `Eliminar nulos en ${col}`;
      codeSnippet = col === 'any' ? `df = df.dropna()` : `df = df.dropna(subset=['${col}'])`;
      newData = newData.filter(row => col === 'any' 
        ? Object.values(row).every(v => v !== null && v !== '') 
        : row[col] !== null && row[col] !== '');
      break;
    }
    case 'fillna': {
      const fCol = params.col || 'all';
      const val = params.value || 0;
      description = `Rellenar nulos en ${fCol} con ${val}`;
      const pyVal = isNaN(Number(val)) ? `'${val}'` : val;
      codeSnippet = fCol === 'all' ? `df = df.fillna(${pyVal})` : `df['${fCol}'] = df['${fCol}'].fillna(${pyVal})`;
      newData = newData.map(row => {
        const nr = { ...row };
        if (fCol === 'all') Object.keys(nr).forEach(k => { if (nr[k] == null || nr[k] === '') nr[k] = val; });
        else if (nr[fCol] == null || nr[fCol] === '') nr[fCol] = val;
        return nr;
      });
      break;
    }
    case 'dedup': {
      description = 'Eliminar duplicados exactos';
      codeSnippet = `df = df.drop_duplicates()`;
      const seen = new Set();
      newData = newData.filter(r => {
        const k = JSON.stringify(r);
        return seen.has(k) ? false : seen.add(k);
      });
      break;
    }
    case 'drop_col': {
      const col = params.col;
      if (!col) throw new Error("Columna requerida");
      description = `Eliminar columna ${col}`;
      codeSnippet = `df = df.drop(columns=['${col}'])`;
      // TIPADO EXPLÍCITO: nr: DataRow para permitir delete
      newData = newData.map(r => { 
        const nr: DataRow = { ...r }; 
        delete nr[col]; 
        return nr; 
      });
      newHeaders = newHeaders.filter(h => h !== col);
      break;
    }

    // --- TRANSFORMACIÓN ---
    case 'rename': {
      const { oldName, newName } = params;
      if (!oldName || !newName) throw new Error("Nombres requeridos");
      description = `Renombrar ${oldName} a ${newName}`;
      codeSnippet = `df = df.rename(columns={'${oldName}': '${newName}'})`;
      newData = newData.map(r => {
        // TIPADO EXPLÍCITO: nr: DataRow
        const nr: DataRow = { ...r, [newName]: r[oldName] };
        delete nr[oldName];
        return nr;
      });
      newHeaders = newHeaders.map(h => h === oldName ? newName : h);
      break;
    }
    case 'replace': {
        // Eliminamos 'col' de la desestructuración para evitar el error "unused variable"
        const { val, newVal } = params; 
        const buscar = params.old || val || ''; 
        const reemp = params.new || newVal || '';
        const targetCol = params.col; // Lo leemos directamente
        
        description = `Reemplazar '${buscar}' por '${reemp}' en ${targetCol}`;
        codeSnippet = `df['${targetCol}'] = df['${targetCol}'].replace('${buscar}', '${reemp}')`;
        newData = newData.map(r => ({
            ...r,
            [targetCol]: r[targetCol] == buscar ? reemp : r[targetCol]
        }));
        break;
    }
    case 'calc': {
      const { col1, op, col2, newName } = params;
      description = `Calc: ${newName} = ${col1} ${op} ${col2}`;
      const isNum = !isNaN(Number(col2));
      codeSnippet = `df['${newName}'] = df['${col1}'] ${op} ${isNum ? col2 : `df['${col2}']`}`;
      newData = newData.map(r => {
        const v1 = Number(r[col1]);
        const v2 = isNum ? Number(col2) : Number(r[col2]);
        let res = 0;
        if (op === '+') res = v1 + v2;
        if (op === '-') res = v1 - v2;
        if (op === '*') res = v1 * v2;
        if (op === '/') res = v2 !== 0 ? v1 / v2 : 0;
        return { ...r, [newName]: parseFloat(res.toFixed(2)) };
      });
      if (!newHeaders.includes(newName)) newHeaders.push(newName);
      break;
    }
    case 'to_upper': {
        const { col } = params;
        description = `Mayúsculas en ${col}`;
        codeSnippet = `df['${col}'] = df['${col}'].str.upper()`;
        newData = newData.map(r => ({ ...r, [col]: String(r[col] || '').toUpperCase() }));
        break;
    }
    case 'split': {
        const { col, delim } = params;
        const delimiter = delim || ' ';
        description = `Dividir ${col} por '${delimiter}'`;
        codeSnippet = `df[['${col}_1', '${col}_2']] = df['${col}'].str.split('${delimiter}', expand=True)`;
        newData = newData.map(r => {
            const val = String(r[col] || '');
            const parts = val.split(delimiter);
            return { 
                ...r, 
                [`${col}_1`]: parts[0] || '', 
                [`${col}_2`]: parts[1] || '' 
            };
        });
        if (!newHeaders.includes(`${col}_1`)) newHeaders.push(`${col}_1`, `${col}_2`);
        break;
    }
    case 'binning': {
        const { col, count } = params;
        const bins = Number(count || 3);
        const newCol = `${col}_cat`;
        description = `Categorizar ${col} en ${bins} grupos`;
        codeSnippet = `df['${newCol}'] = pd.cut(df['${col}'], bins=${bins})`;
        
        // Lógica simple de binning para visualización
        const values = newData.map(r => Number(r[col])).filter(n => !isNaN(n));
        if(values.length > 0) {
            const min = Math.min(...values);
            const max = Math.max(...values);
            const step = (max - min) / bins;
            newData = newData.map(r => {
                const val = Number(r[col]);
                if(isNaN(val)) return { ...r, [newCol]: 'NaN' };
                let binIdx = Math.floor((val - min) / step);
                if(binIdx >= bins) binIdx = bins - 1;
                return { ...r, [newCol]: `Bin ${binIdx + 1}` };
            });
            if (!newHeaders.includes(newCol)) newHeaders.push(newCol);
        }
        break;
    }
    
    // --- FILTRADO Y ORDEN ---
    case 'filter': {
      const { col, op, val } = params;
      description = `Filtrar ${col} ${op} ${val}`;
      const isNum = !isNaN(Number(val));
      const pyVal = isNum ? val : `'${val}'`;
      codeSnippet = `df = df[df['${col}'] ${op} ${pyVal}]`;
      newData = newData.filter(r => safeCompare(r[col], val, op));
      break;
    }
    case 'sort': {
      const { col, order } = params;
      description = `Ordenar por ${col} (${order})`;
      codeSnippet = `df = df.sort_values(by='${col}', ascending=${order === 'asc'})`;
      
      newData = [...newData].sort((a, b) => {
        const valA = a[col];
        const valB = b[col];

        // Manejo de nulos para que siempre queden al final o principio consistentemente
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        // Intento de ordenamiento numérico si es posible
        const numA = Number(valA);
        const numB = Number(valB);
        
        if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
            return order === 'asc' ? numA - numB : numB - numA;
        }

        // Fallback a string
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return order === 'asc' ? -1 : 1;
        if (strA > strB) return order === 'asc' ? 1 : -1;
        return 0;
      });
      break;
    }

    // --- AVANZADO / SERIES DE TIEMPO ---
    case 'rolling': {
        const { col, window } = params;
        const win = Number(window || 3);
        const newCol = `${col}_ma_${win}`;
        description = `Media Móvil (${win}) de ${col}`;
        codeSnippet = `df['${newCol}'] = df['${col}'].rolling(${win}).mean()`;
        newData = newData.map((r, i, arr) => {
          if (i < win - 1) return { ...r, [newCol]: null };
          const slice = arr.slice(i - win + 1, i + 1);
          const avg = slice.reduce((s, item) => s + Number(item[col] || 0), 0) / win;
          return { ...r, [newCol]: parseFloat(avg.toFixed(2)) };
        });
        if (!newHeaders.includes(newCol)) newHeaders.push(newCol);
        break;
    }
    case 'cumsum': {
        const { col } = params;
        const newCol = `${col}_cumsum`;
        description = `Suma Acumulada de ${col}`;
        codeSnippet = `df['${newCol}'] = df['${col}'].cumsum()`;
        let acc = 0;
        newData = newData.map(r => {
            acc += Number(r[col] || 0);
            return { ...r, [newCol]: acc };
        });
        if (!newHeaders.includes(newCol)) newHeaders.push(newCol);
        break;
    }
    case 'diff': {
        const { col } = params;
        const newCol = `${col}_diff`;
        description = `Diferencia en ${col}`;
        codeSnippet = `df['${newCol}'] = df['${col}'].diff()`;
        newData = newData.map((r, i, arr) => {
            const prev = i > 0 ? Number(arr[i-1][col] || 0) : 0;
            const curr = Number(r[col] || 0);
            return { ...r, [newCol]: i === 0 ? null : curr - prev };
        });
        if (!newHeaders.includes(newCol)) newHeaders.push(newCol);
        break;
    }

    // --- ANÁLISIS ESTRUCTURAL ---
    case 'sample': {
        const n = 5;
        description = `Muestra aleatoria (${n})`;
        codeSnippet = `df = df.sample(n=${n})`;
        newData = [...newData].sort(() => 0.5 - Math.random()).slice(0, n);
        break;
    }
    case 'groupby': {
        const { col, aggCol, func } = params;
        description = `Agrupar por ${col} (${func} ${aggCol})`;
        codeSnippet = `df = df.groupby('${col}')['${aggCol}'].${func}().reset_index()`;
        
        const groups: Record<string, number> = {};
        newData.forEach(r => {
            const key = String(r[col]);
            const val = Number(r[aggCol] || 0);
            if (!groups[key]) groups[key] = 0;
            if (func === 'count') groups[key] += 1;
            else groups[key] += val; 
        });
        
        newData = Object.keys(groups).map(k => {
            const resultRow: DataRow = {};
            resultRow[col] = k;
            resultRow[aggCol] = groups[k];
            return resultRow;
        });
        newHeaders = [col, aggCol];
        break;
    }
    case 'pivot': {
        const { col: indexCol, aggCol: valCol, func } = params; // Reutilizamos inputs del modal groupby para simplicidad visual o necesitamos modal propio
        // Asumimos params genéricos para pivot
        description = `Pivot Table (Index: ${indexCol})`;
        codeSnippet = `df = df.pivot_table(index='${indexCol}', values='${valCol}', aggfunc='${func}')`;
        // Simulación visual idéntica a groupby para este demo
        // (Pivot real requiere estructura de columnas dinámica compleja)
        const groups: Record<string, number> = {};
        newData.forEach(r => {
            const key = String(r[indexCol]);
            const val = Number(r[valCol] || 0);
            if (!groups[key]) groups[key] = 0;
            if (func === 'count') groups[key] += 1;
            else groups[key] += val; 
        });
        newData = Object.keys(groups).map(k => {
             const resultRow: DataRow = {};
             resultRow[indexCol] = k;
             resultRow[valCol] = groups[k];
             return resultRow;
        });
        newHeaders = [indexCol, valCol];
        break;
    }
    case 'melt': {
        const { col: idVar } = params;
        description = `Melt manteniendo ${idVar}`;
        codeSnippet = `df = df.melt(id_vars=['${idVar}'])`;
        const valVars = newHeaders.filter(x => x !== idVar);
        const melted: DataRow[] = [];
        newData.forEach(r => {
            valVars.forEach(variable => {
                const row: DataRow = {};
                row[idVar] = r[idVar];
                row['variable'] = variable;
                row['value'] = r[variable];
                melted.push(row);
            });
        });
        newData = melted;
        newHeaders = [idVar, 'variable', 'value'];
        break;
    }

    // --- EXPORTACIÓN REAL ---
    case 'export_csv': 
    case 'export_json': {
       description = opId === 'export_csv' ? 'Exportar a CSV' : 'Exportar a JSON';
       codeSnippet = opId === 'export_csv' ? `df.to_csv('data.csv')` : `df.to_json('data.json')`;
       break;
    }

    default:
      description = `Operación: ${opId}`;
      codeSnippet = `# TODO: Implementar ${opId}`;
  }

  return { newData, newHeaders, codeSnippet, description };
};