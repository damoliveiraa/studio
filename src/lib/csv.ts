/**
 * Converts an array of objects into a CSV string.
 * @param data The array of objects to convert.
 * @returns A string representing the data in CSV format.
 */
export function convertToCSV(data: Record<string, any>[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')]; // Header row

  for (const row of data) {
    const values = headers.map(header => {
      let cellValue = row[header];

      // 1. Handle null or undefined values
      if (cellValue === null || cellValue === undefined) {
        return '""'; // Return as an empty quoted string
      }

      // 2. If the value is an object or array, stringify it
      if (typeof cellValue === 'object') {
        cellValue = JSON.stringify(cellValue);
      }

      // 3. Convert to a string to handle all primitive types
      const stringValue = String(cellValue);

      // 4. Escape any double quotes within the string value
      const escaped = stringValue.replace(/"/g, '""');

      // 5. Wrap the final value in double quotes to handle commas, newlines, etc.
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}
