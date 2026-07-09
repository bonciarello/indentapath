/**
 * Test suite per il Ricostruttore di Percorsi
 * Testa le funzioni di parsing e costruzione dell'albero
 */
'use strict';

// ── Reimplementazione delle funzioni core (stessa logica dell'index.html) ──

function detectIndentStep(lines) {
  let minSpaces = Infinity;
  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.length === 0) continue;
    const leading = line.length - trimmed.length;
    if (leading > 0 && leading < minSpaces) {
      minSpaces = leading;
    }
  }
  if (minSpaces === Infinity) return 2;
  if (minSpaces >= 3 && minSpaces <= 4) return 4;
  if (minSpaces >= 2) return minSpaces;
  return 2;
}

function parseLine(line) {
  // Expand tabs to 2 spaces for uniform indentation calculation
  const expanded = line.replace(/\t/g, '  ');
  const trimmedStart = expanded.trimStart();
  if (trimmedStart.length === 0) return null;

  const leading = expanded.length - trimmedStart.length;
  let name = trimmedStart;

  let explicitType = null;
  if (name.endsWith('/') && name.length > 1) {
    explicitType = 'folder';
    name = name.slice(0, -1);
  }

  const markerMatch = name.match(/^([-*•‣◦▪▸+]|\d+[.)])\s+/);
  if (markerMatch) {
    name = name.slice(markerMatch[0].length);
  }

  name = name.trim();
  if (name.length === 0) return null;

  return { leading, name, explicitType };
}

function buildTree(rawText) {
  const rawLines = rawText.split('\n');
  const parsedLines = [];
  for (const line of rawLines) {
    const parsed = parseLine(line);
    if (parsed) parsedLines.push(parsed);
  }
  if (parsedLines.length === 0) return null;

  const indentStep = detectIndentStep(rawLines);

  for (const pl of parsedLines) {
    pl.depth = Math.round(pl.leading / indentStep);
  }

  const root = { name: '__root__', type: 'folder', children: [] };
  const stack = [{ node: root, depth: -1 }];

  for (const pl of parsedLines) {
    while (stack.length > 1 && stack[stack.length - 1].depth >= pl.depth) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].node;

    const node = {
      name: pl.name,
      type: pl.explicitType || 'file',
      children: []
    };
    parent.children.push(node);
    stack.push({ node, depth: pl.depth });
  }

  function markFolders(node) {
    if (node.children.length > 0) {
      node.type = 'folder';
    }
    for (const child of node.children) {
      markFolders(child);
    }
  }
  markFolders(root);

  return root;
}

function countNodes(node) {
  let folders = 0;
  let files = 0;
  function walk(n) {
    if (n === node) {
      for (const child of n.children) walk(child);
      return;
    }
    if (n.type === 'folder') folders++;
    else files++;
    for (const child of n.children) walk(child);
  }
  walk(node);
  return { folders, files };
}

// ── Test runner ──
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertDeepEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(`${msg || 'Deep equal failed'}\n  expected: ${b}\n  actual:   ${a}`);
  }
}

// ── Tests ──

console.log('\n📁 Ricostruttore di Percorsi — Test Suite\n');

// --- detectIndentStep ---
console.log('detectIndentStep:');

test('rileva indentazione a 2 spazi', () => {
  const lines = ['root', '  child', '    grandchild'];
  assert(detectIndentStep(lines) === 2);
});

test('rileva indentazione a 4 spazi', () => {
  const lines = ['root', '    child', '        grandchild'];
  assert(detectIndentStep(lines) === 4);
});

test('usa default 2 per input senza indentazione', () => {
  const lines = ['a', 'b', 'c'];
  assert(detectIndentStep(lines) === 2);
});

// --- parseLine ---
console.log('\nparseLine:');

test('parsa una riga senza indentazione', () => {
  const r = parseLine('README.md');
  assert(r !== null);
  assert(r.name === 'README.md');
  assert(r.leading === 0);
  assert(r.explicitType === null);
});

test('parsa una riga indentata con 2 spazi', () => {
  const r = parseLine('  src/');
  assert(r !== null);
  assert(r.name === 'src');
  assert(r.leading === 2);
  assert(r.explicitType === 'folder');
});

test('parsa una riga con trattino', () => {
  const r = parseLine('- Header.js');
  assert(r !== null);
  assert(r.name === 'Header.js');
  assert(r.leading === 0);
});

test('parsa una riga con asterisco', () => {
  const r = parseLine('  * Footer.js');
  assert(r !== null);
  assert(r.name === 'Footer.js');
  assert(r.leading === 2);
});

test('parsa una riga con marker numerato', () => {
  const r = parseLine('1. Primo elemento');
  assert(r !== null);
  assert(r.name === 'Primo elemento');
});

test('restituisce null per riga vuota', () => {
  assert(parseLine('') === null);
  assert(parseLine('   ') === null);
});

test('mantiene nome con spazi interni', () => {
  const r = parseLine('  Il mio file.js');
  assert(r !== null);
  assert(r.name === 'Il mio file.js');
});

// --- buildTree ---
console.log('\nbuildTree:');

test('costruisce albero da input semplice', () => {
  const input = `src/
  components/
    Header.js
    Footer.js
  index.js
README.md`;
  const tree = buildTree(input);
  assert(tree !== null);
  assert(tree.children.length === 2, '2 nodi radice');
  assert(tree.children[0].name === 'src', 'primo nodo: src');
  assert(tree.children[0].type === 'folder', 'src è folder');
  assert(tree.children[0].children.length === 2, 'src ha 2 figli');
  assert(tree.children[0].children[0].name === 'components', 'components');
  assert(tree.children[0].children[1].name === 'index.js', 'index.js');
  assert(tree.children[0].children[0].children.length === 2, '2 file in components');
  assert(tree.children[1].name === 'README.md', 'README.md');
  assert(tree.children[1].type === 'file', 'README è file');
});

test('gestisce input a singola riga', () => {
  const tree = buildTree('solo.txt');
  assert(tree !== null);
  assert(tree.children.length === 1);
  assert(tree.children[0].name === 'solo.txt');
  assert(tree.children[0].type === 'file');
});

test('restituisce null per input vuoto', () => {
  assert(buildTree('') === null);
  assert(buildTree('\n\n  \n') === null);
});

test('gestisce indentazione mista con trattini', () => {
  const input = `- src
  - components
    - Header.js
  - utils
- README.md`;
  const tree = buildTree(input);
  assert(tree !== null);
  assert(tree.children.length === 2);
  assert(tree.children[0].name === 'src');
  assert(tree.children[1].name === 'README.md');
});

test('gestisce cartelle esplicite con / finale', () => {
  const input = `vuota/`;
  const tree = buildTree(input);
  assert(tree !== null);
  assert(tree.children[0].type === 'folder');
  assert(tree.children[0].name === 'vuota');
});

test('nodo con figli diventa automaticamente folder', () => {
  const input = `genitore
  figlio.txt`;
  const tree = buildTree(input);
  assert(tree.children[0].type === 'folder');
  assert(tree.children[0].name === 'genitore');
});

test('gestisce annidamento profondo', () => {
  const input = `a
  b
    c
      d
        e
          f
            g
              h`;
  const tree = buildTree(input);
  let node = tree.children[0];
  let depth = 0;
  while (node.children.length > 0) {
    depth++;
    node = node.children[0];
  }
  assert(depth === 7, 'profondità 7');
});

test('gestisce tab come indentazione', () => {
  const input = `src/
\tcomponents/
\t\tHeader.js
\tutils/
\t\thelpers.js
README.md`;
  const tree = buildTree(input);
  assert(tree !== null);
  assert(tree.children.length === 2);
  assert(tree.children[0].name === 'src');
  assert(tree.children[0].children.length === 2);
});

// --- countNodes ---
console.log('\ncountNodes:');

test('conta cartelle e file correttamente', () => {
  const input = `src/
  components/
    Header.js
    Footer.js
  utils/
    helpers.js
  index.js
README.md`;
  const tree = buildTree(input);
  const counts = countNodes(tree);
  assert(counts.folders === 3, `3 cartelle, trovate ${counts.folders}`);
  assert(counts.files === 5, `5 file, trovati ${counts.files}`);
});

test('conta zero per albero vuoto', () => {
  const tree = buildTree('file.txt');
  const counts = countNodes(tree);
  assert(counts.folders === 0);
  assert(counts.files === 1);
});

// --- toTreeText (per export TXT) ---
console.log('\ntoTreeText (export TXT):');

function toTreeText(node, prefix, isLast, isRoot) {
  const lines = [];
  const suffix = node.type === 'folder' ? '/' : '';
  if (isRoot) {
    lines.push(node.name + suffix);
  } else {
    const connector = isLast ? '└── ' : '├── ';
    lines.push(prefix + connector + node.name + suffix);
  }
  const childPrefix = isRoot ? '' : (prefix + (isLast ? '    ' : '│   '));
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const childIsLast = i === node.children.length - 1;
    lines.push(...toTreeText(child, childPrefix, childIsLast, false));
  }
  return lines;
}

test('produce testo indentato corretto', () => {
  const input = `src/
  index.js
README.md`;
  const tree = buildTree(input);
  const lines = [];
  for (let i = 0; i < tree.children.length; i++) {
    const child = tree.children[i];
    const isLast = i === tree.children.length - 1;
    lines.push(...toTreeText(child, '', isLast, true));
  }
  const output = lines.join('\n');
  const expected = `src/
└── index.js
README.md`;
  assert(output === expected, `\n  expected:\n${expected}\n  actual:\n${output}`);
});

test('produce struttura annidata con box-drawing', () => {
  const input = `src/
  components/
    Header.js
    Footer.js
  index.js`;
  const tree = buildTree(input);
  const lines = [];
  for (let i = 0; i < tree.children.length; i++) {
    const child = tree.children[i];
    const isLast = i === tree.children.length - 1;
    lines.push(...toTreeText(child, '', isLast, true));
  }
  const output = lines.join('\n');
  const expected = `src/
├── components/
│   ├── Header.js
│   └── Footer.js
└── index.js`;
  assert(output === expected, `\n  expected:\n${expected}\n  actual:\n${output}`);
});

// --- toJSONData ---
console.log('\ntoJSONData (export JSON):');

function toJSONData(node, isRoot) {
  if (isRoot) {
    return node.children.map(c => toJSONData(c, false));
  }
  const obj = {
    name: node.name,
    type: node.type
  };
  if (node.children && node.children.length > 0) {
    obj.children = node.children.map(c => toJSONData(c, false));
  }
  return obj;
}

test('produce array JSON annidato', () => {
  const input = `src/
  index.js
README.md`;
  const tree = buildTree(input);
  const data = toJSONData(tree, true);
  const expected = [
    {
      name: 'src',
      type: 'folder',
      children: [
        { name: 'index.js', type: 'file' }
      ]
    },
    { name: 'README.md', type: 'file' }
  ];
  assertDeepEqual(data, expected, 'JSON structure');
});

// ── Summary ──
console.log(`\n${'─'.repeat(40)}`);
console.log(`Risultati: ${passed} passati, ${failed} falliti su ${passed + failed} test`);
console.log(`${'─'.repeat(40)}\n`);

if (failed > 0) {
  process.exit(1);
}
