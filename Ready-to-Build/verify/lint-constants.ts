import fs from 'fs';
import path from 'path';
import ts from 'typescript';

// Load balance.json to extract all balance numeric literals
const balancePath = path.resolve(process.cwd(), 'data/balance.json');
if (!fs.existsSync(balancePath)) {
  console.error(`Error: balance.json not found at ${balancePath}`);
  process.exit(1);
}

const balanceRaw = JSON.parse(fs.readFileSync(balancePath, 'utf-8'));

function extractNumbers(obj: any, set: Set<number>) {
  if (typeof obj === 'number') {
    // Only include non-trivial numbers (exclude 0, 1, -1, 2)
    if (![0, 1, -1, 2].includes(obj)) {
      set.add(obj);
      // Also add absolute value and rounded value
      set.add(Math.abs(obj));
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      extractNumbers(item, set);
    }
  } else if (obj !== null && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      extractNumbers(obj[key], set);
    }
  }
}

const balanceNumbers = new Set<number>();
extractNumbers(balanceRaw, balanceNumbers);

// Permitted engine tick constants from ENGINE-SPEC §1.1
const ALLOWED_TICK_INTERVALS = new Set([64, 70, 200, 12]);

// Scan src/ files
const srcDir = path.resolve(process.cwd(), 'src');
let violations: Array<{ file: string; line: number; value: number; lineText: string }> = [];

function checkFile(filePath: string) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const lines = code.split('\n');
  const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);

  function visit(node: ts.Node) {
    if (ts.isNumericLiteral(node)) {
      const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      const lineIdx = pos.line;
      const lineText = lines[lineIdx];
      const prevLineText = lineIdx > 0 ? lines[lineIdx - 1] : '';

      // Check for annotation exemption
      const isAnnotated = lineText.includes('// non-balance:') ||
                          lineText.includes('/* non-balance:') ||
                          prevLineText.includes('// non-balance:') ||
                          prevLineText.includes('/* non-balance:');

      if (!isAnnotated) {
        let val = Number(node.text);
        if (node.parent && ts.isPrefixUnaryExpression(node.parent) && node.parent.operator === ts.SyntaxKind.MinusToken) {
          val = -val;
        }

        // Allow trivial 0, 1, -1, 2
        if (![0, 1, -1, 2].includes(val)) {
          if (balanceNumbers.has(val) || balanceNumbers.has(Math.abs(val))) {
            violations.push({
              file: path.relative(process.cwd(), filePath),
              line: lineIdx + 1,
              value: val,
              lineText: lineText.trim(),
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function scanDir(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
      checkFile(full);
    }
  }
}

scanDir(srcDir);

if (violations.length > 0) {
  console.error(`FAIL: npm run lint:constants found ${violations.length} unannotated balance constant(s):`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} -> Literal ${v.value} in: "${v.lineText}"`);
  }
  console.error(`\nEvery constant must come from data/balance.json via loader, or be annotated with // non-balance: <reason>`);
  process.exit(1);
} else {
  console.log(`PASS: npm run lint:constants reports 0 hard-coded balance numbers.`);
  process.exit(0);
}
