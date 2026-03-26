import { Parser } from 'json2csv';

export const sendCsv = (res, rows, fields, filename) => {
  const parser = new Parser({ fields });
  const csv = parser.parse(rows);

  res.header('Content-Type', 'text/csv');
  res.attachment(filename);
  res.send(csv);
};

