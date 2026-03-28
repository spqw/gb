import { readFileSync, writeFileSync } from "node:fs";

const input = "/home/ubuntu/gb/guide.txt";
const output = "/home/ubuntu/gb/guide.ps";
const lines = readFileSync(input, "utf8").replace(/\r/g, "").split("\n");

const pageWidth = 612;
const pageHeight = 792;
const left = 54;
const top = 738;
const lineHeight = 14;
const bottom = 54;

const escapePs = (value) =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const pages = [];
let current = [];
let y = top;

for (const rawLine of lines) {
  if (y < bottom) {
    pages.push(current);
    current = [];
    y = top;
  }

  const line = rawLine.length === 0 ? " " : rawLine;
  current.push({ y, line });
  y -= lineHeight;
}

if (current.length > 0) {
  pages.push(current);
}

const body = pages
  .map((page, index) => {
    const rows = page
      .map(({ y: rowY, line }) => `${left} ${rowY} moveto (${escapePs(line)}) show`)
      .join("\n");
    return `%%Page: ${index + 1} ${index + 1}
/Courier findfont 10 scalefont setfont
${rows}
showpage`;
  })
  .join("\n");

const ps = `%!PS-Adobe-3.0
%%BoundingBox: 0 0 ${pageWidth} ${pageHeight}
%%Pages: ${pages.length}
%%EndComments
${body}
%%EOF
`;

writeFileSync(output, ps);
