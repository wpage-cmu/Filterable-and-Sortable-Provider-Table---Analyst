// Mapping from frontend column names to SQL column names
const columnMapping = {
  firstName: 'first_name',
  lastName: 'last_name',
  npi: 'npi',
  attestationStatus: 'attestation_status',
  attestationDueDate: 'attestation_due_date',
  lastAttestationDate: 'last_attestation_date',
  specialty: 'specialty',
  acceptingPatientStatus: 'accepting_patient_status',
  primaryWorkAddress: 'primary_work_address',
  primaryPracticeState: 'primary_practice_state',
  otherPracticeStates: 'other_practice_states'
};

export const generateSql = (
  searchQuery: string, 
  filters: Record<string, any>, 
  sortConfig: {
    key: string | null;
    direction: 'asc' | 'desc';
  }
): string => {
  let sql = 'SELECT\n  *\nFROM providers';
  
  const conditions: string[] = [];
  
  // Add search conditions
  if (searchQuery && searchQuery.trim()) {
    conditions.push(`(\n    first_name LIKE '%${searchQuery.trim()}%'\n    OR last_name LIKE '%${searchQuery.trim()}%'\n    OR specialty LIKE '%${searchQuery.trim()}%'\n    OR primary_work_address LIKE '%${searchQuery.trim()}%'\n  )`);
  }
  
  // Add filters - now using column mapping
  Object.entries(filters).forEach(([column, value]) => {
    if (value && Array.isArray(value) && value.length > 0) {
      const sqlColumn = columnMapping[column] || column;
      const values = value.map(v => `'${v}'`).join(', ');
      conditions.push(`${sqlColumn} IN (${values})`);
    } else if (value && typeof value === 'string' && value.trim().length > 0) {
      const sqlColumn = columnMapping[column] || column;
      conditions.push(`${sqlColumn} LIKE '%${value.trim()}%'`);
    }
  });
  
  // Add WHERE clause only if there are conditions
  if (conditions.length > 0) {
    sql += '\nWHERE ' + conditions.join('\n  AND ');
  }
  
  // Add sorting - now using column mapping
  if (sortConfig.key) {
    const sqlColumn = columnMapping[sortConfig.key] || sortConfig.key;
    sql += `\nORDER BY ${sqlColumn} ${sortConfig.direction.toUpperCase()}`;
  }
  
  return sql;
};

// Helper function to check if there are any active filters
export const hasActiveFilters = (
  searchQuery: string,
  filters: Record<string, any>,
  sortConfig: {
    key: string | null;
    direction: 'asc' | 'desc';
  }
): boolean => {
  // Check if search query exists
  if (searchQuery && searchQuery.trim()) {
    return true;
  }
  
  // Check if any filters are applied
  const hasFilters = Object.entries(filters).some(([key, value]) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value && typeof value === 'string' && value.trim().length > 0;
  });
  
  if (hasFilters) {
    return true;
  }
  
  // Check if sorting is applied
  if (sortConfig.key) {
    return true;
  }
  
  return false;
};