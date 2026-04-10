const fs = require("fs");
const path = require("path");
const p = path.join(__dirname, "..", "src", "pages", "admin", "Dashboard.tsx");
let s = fs.readFileSync(p, "utf8");
const clean = `      ${"\u{1F534}"} Not enough data yet — needs 2+ months of records.`;
s = s.replace(
  /<Badge className="border border-red-200 bg-red-50 text-xs font-normal text-red-900 dark:border-red-800 dark:bg-red-950\/40 dark:text-red-100">\s*[^<]*<\/Badge>/,
  `<Badge className="border border-red-200 bg-red-50 text-xs font-normal text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">\n${clean}\n    </Badge>`
);
fs.writeFileSync(p, s);
