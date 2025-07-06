export const generateSql = (searchQuery: string, filters: Record<string, any>, sortConfig: {
  key: string | null;
  direction: 'asc' | 'desc';
}): string => {
  let sql = 'SELECT\n  *\nFROM providers\nWHERE 1=1';
  // Add search conditions
  if (searchQuery) {
    sql += `\n  AND (\n    first_name LIKE '%${searchQuery}%'\n    OR last_name LIKE '%${searchQuery}%'\n    OR specialty LIKE '%${searchQuery}%'\n  )`;
  }
  // Add filters
  Object.entries(filters).forEach(([column, value]) => {
    if (value && Array.isArray(value) && value.length > 0) {
      const values = value.map(v => `'${v}'`).join(', ');
      sql += `\n  AND ${column} IN (${values})`;
    } else if (value && typeof value === 'string' && value.length > 0) {
      sql += `\n  AND ${column} LIKE '%${value}%'`;
    }
  });
  // Add sorting
  if (sortConfig.key) {
    sql += `\nORDER BY ${sortConfig.key} ${sortConfig.direction.toUpperCase()}`;
  }
  return sql;
};