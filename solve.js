// A fast, dependency-free reader for broken CSV text, written from scratch.
// run(input) answers {columns, rows, errors} for one case's {text, header},
// with exactly csv-reader 1.0.0's broken-row policy: a leading U+FEFF is
// dropped, records end at LF or CRLF, empty lines are no records, a CR outside
// quotes that is not followed by LF is dropped (stray_cr), a quoted field runs
// to the next non-doubled quote ("" inside is one quote, CRLF or a lone CR
// inside becomes LF, trailing junk after the closing quote is kept as it
// stands with quote_junk), a quote that never closes is a literal character
// and the rest is re-read as unquoted (unterminated_quote), quotes inside an
// unquoted field are literal, fields stay strings, and rows are padded
// (short_row) or cut (long_row) to the first record's width.
//
// Speed comes from scanning, not from per-character string building: each
// field is located with one charCodeAt sweep and copied out with a single
// slice, so a field costs one pass and one string instead of one allocation
// per character. Field results travel in three shared slots (fv/fe/fa) so no
// object is allocated per field; only rows, fields and error records are.

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  let pos = 0;
  let line = 1;
  if (n > 0 && text.charCodeAt(0) === 0xfeff) pos = 1;
  let recordLine = 1;
  let recordRow = null;
  // Shared field result slots (avoids per-field allocation).
  let fv = '';
  let fe = 0; // 0 comma, 1 line break, 2 end
  let fa = 0;

  function readUnquoted(start) {
    let v = start;
    let added = 0;
    for (;;) {
      let p = pos;
      while (p < n) {
        const c = text.charCodeAt(p);
        if (c === 44 || c === 10 || c === 13) break;
        p += 1;
      }
      if (p > pos) {
        const s = text.slice(pos, p);
        v = v === '' ? s : v + s;
        added += p - pos;
        pos = p;
      }
      if (pos >= n) { fe = 2; break; }
      const c = text.charCodeAt(pos);
      if (c === 44) { pos += 1; fe = 0; break; }
      if (c === 10) { pos += 1; line += 1; fe = 1; break; }
      if (text.charCodeAt(pos + 1) === 10) { pos += 2; line += 1; fe = 1; break; }
      errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
      pos += 1;
    }
    fv = v;
    fa = added;
  }

  function readQuoted() {
    const open = pos;
    const openLine = line;
    pos += 1;
    let v = '';
    for (;;) {
      let p = pos;
      while (p < n) {
        const c = text.charCodeAt(p);
        if (c === 34 || c === 10 || c === 13) break;
        p += 1;
      }
      if (p >= n) {
        pos = open + 1;
        line = openLine;
        errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
        readUnquoted('"');
        return;
      }
      const c = text.charCodeAt(p);
      if (c === 34) {
        if (p > pos) {
          const s = text.slice(pos, p);
          v = v === '' ? s : v + s;
        }
        if (text.charCodeAt(p + 1) === 34) {
          v += '"';
          pos = p + 2;
          continue;
        }
        pos = p + 1;
        if (pos >= n) { fv = v; fe = 2; return; }
        const d = text.charCodeAt(pos);
        if (d === 44) { pos += 1; fv = v; fe = 0; return; }
        if (d === 10) { pos += 1; line += 1; fv = v; fe = 1; return; }
        if (d === 13 && text.charCodeAt(pos + 1) === 10) { pos += 2; line += 1; fv = v; fe = 1; return; }
        readUnquoted(v);
        if (fa > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
        return;
      }
      if (p > pos) {
        const s = text.slice(pos, p);
        v = v === '' ? s : v + s;
      }
      v += '\n';
      line += 1;
      pos = p + (c === 13 && text.charCodeAt(p + 1) === 10 ? 2 : 1);
    }
  }

  for (;;) {
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) { pos += 1; line += 1; }
      else if (c === 13 && text.charCodeAt(pos + 1) === 10) { pos += 2; line += 1; }
      else break;
    }
    if (pos >= n) break;
    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted = false;
    do {
      quoted = text.charCodeAt(pos) === 34;
      if (quoted) readQuoted(); else readUnquoted('');
      fields.push(fv);
    } while (fe === 0);
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;
    if (width < 0) width = fields.length;
    if (header && columns === null) { columns = fields; continue; }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
