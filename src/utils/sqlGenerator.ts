// Mapping from frontend column names to SQL column names
const columnMapping = {
  firstName: 'first_name',
  lastName: 'last_name',
  npi: 'npi',
  attestationStatus: 'attestation_status',
  lastAttestationDate: 'last_attestation_date',
  specialty: 'specialty',
  primaryPracticeState: 'primary_practice_state',
  otherPracticeStates: 'other_practice_states'
};

export const generateSql = (searchQuery: string, filters: Record<string, any>, sortConfig: {
  key: string | null;
  direction: 'asc' | 'desc';
}): string => {
  let sql = 'SELECT\n  *\nFROM providers\nWHERE 1=1';
  
  // Add search conditions
  if (searchQuery && searchQuery.trim()) {
    sql += `\n  AND (\n    first_name LIKE '%${searchQuery}%'\n    OR last_name LIKE '%${searchQuery}%'\n    OR specialty LIKE '%${searchQuery}%'\n  )`;
  }
  
  // Add filters
  Object.entries(filters).forEach(([column, value]) => {
    const sqlColumn = columnMapping[column] || column;
    
    if (value && Array.isArray(value) && value.length > 0) {
      // Handle array filters (multiselect)
      const values = value.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');
      
      if (column === 'otherPracticeStates') {
        // Special handling for array columns in SQL
        sql += `\n  AND (\n    ${values.split(', ').map(val => `${sqlColumn} LIKE '%${val.replace(/'/g, '')}%'`).join('\n    OR ')}\n  )`;
      } else {
        sql += `\n  AND ${sqlColumn} IN (${values})`;
      }
    } else if (value && typeof value === 'string' && value.trim().length > 0) {
      // Handle text filters
      const escapedValue = value.replace(/'/g, "''");
      sql += `\n  AND ${sqlColumn} LIKE '%${escapedValue}%'`;
    }
  });
  
  // Add sorting
  if (sortConfig.key) {
    const sqlSortColumn = columnMapping[sortConfig.key] || sortConfig.key;
    sql += `\nORDER BY ${sqlSortColumn} ${sortConfig.direction.toUpperCase()}`;
  }
  
  return sql;
};