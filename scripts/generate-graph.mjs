// scripts/generate-graph.mjs
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(['.git', '.github', '_site', 'node_modules', 'scripts', '.vscode', 'vendor']);
const VALID_EXTS = new Set(['.html', '.js', '.mjs']);

const nodes = new Set();
const edges = []; // { from, to, type }

// 統一轉換為 POSIX 路徑 (相容 Windows 與 Linux)
const toPosix = (p) => p.split(path.sep).join('/');

// 1. 遞迴掃描專案檔案
function walk(dir) {
    let results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (VALID_EXTS.has(path.extname(entry.name))) {
            results.push(fullPath);
        }
    }
    return results;
}

// 解析相對路徑或 Jekyll 絕對路徑
function resolveLocalPath(currentFile, targetPath) {
    if (!targetPath || /^(https?:|\/\/|data:)/.test(targetPath)) return null;
    // 清除 Jekyll Liquid 語法，例如 {{ '/mindmap/js/main.js' | relative_url }}
    const cleaned = targetPath
        .replace(/\{\{\s*['"]([^'"]+)['"]\s*\|\s*relative_url\s*\}\}/g, '$1')
        .split('?')[0]
        .trim();

    let resolved;
    if (cleaned.startsWith('/')) {
        resolved = path.join(ROOT, cleaned.slice(1));
    } else {
        resolved = path.resolve(path.dirname(currentFile), cleaned);
    }

    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        return toPosix(path.relative(ROOT, resolved));
    }
    return null;
}

// 2. 分析檔案內容
const files = walk(ROOT);
for (const file of files) {
    const relPath = toPosix(path.relative(ROOT, file));
    const content = fs.readFileSync(file, 'utf8');
    const ext = path.extname(file);

    nodes.add(relPath);

    if (ext === '.html') {
        // A. 解析 Front Matter 的 layout
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (fmMatch) {
            const layoutMatch = fmMatch[1].match(/^layout:\s*([^\s#]+)/m);
            if (layoutMatch) {
                const target = `_layouts/${layoutMatch[1].trim()}.html`;
                if (fs.existsSync(path.join(ROOT, target))) {
                    nodes.add(target);
                    edges.push({ from: relPath, to: target, type: 'layout' });
                }
            }
        }

        // B. 解析 {% include xxx.html %}
        const includeRegex = /\{%\s*include\s+([^\s%]+)/g;
        let incMatch;
        while ((incMatch = includeRegex.exec(content)) !== null) {
            const incFile = incMatch[1].replace(/['"]/g, '');
            const target = `_includes/${incFile}`;
            if (fs.existsSync(path.join(ROOT, target))) {
                nodes.add(target);
                edges.push({ from: relPath, to: target, type: 'include' });
            }
        }

        // C. 解析 <script ... src="...">
        const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g;
        let scriptMatch;
        while ((scriptMatch = scriptRegex.exec(content)) !== null) {
            const target = resolveLocalPath(file, scriptMatch[1]);
            if (target) {
                nodes.add(target);
                edges.push({ from: relPath, to: target, type: 'script' });
            }
        }
    } else if (ext === '.js' || ext === '.mjs') {
        // D. 解析 ES Modules import / export ... from '...'
        const importRegex = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
        let impMatch;
        while ((impMatch = importRegex.exec(content)) !== null) {
            const target = resolveLocalPath(file, impMatch[1]);
            if (target) {
                nodes.add(target);
                edges.push({ from: relPath, to: target, type: 'import' });
            }
        }
    }
}

// 3. 依頂層資料夾分群，輸出 Graphviz DOT 格式
const groups = new Map();
for (const node of nodes) {
    const topDir = node.includes('/') ? node.split('/')[0] : 'root';
    if (!groups.has(topDir)) groups.set(topDir, []);
    groups.get(topDir).push(node);
}

const getNodeStyle = (node) => {
    if (node.startsWith('_layouts/')) return 'fillcolor="#ede9fe", color="#7c3aed"';
    if (node.startsWith('_includes/')) return 'fillcolor="#ccfbf1", color="#0d9488"';
    if (node.endsWith('.js') || node.endsWith('.mjs')) return 'fillcolor="#e0f2fe", color="#0284c7"';
    return 'fillcolor="#fef3c7", color="#d97706"';
};

const getEdgeStyle = (type) => {
    switch (type) {
        case 'layout': return 'color="#7c3aed", style="bold", label="layout"';
        case 'include': return 'color="#0d9488", style="dashed", label="include"';
        case 'script': return 'color="#d97706", label="script"';
        case 'import': return 'color="#0284c7"';
        default: return '';
    }
};

let dot = `digraph ProjectArchitecture {
  rankdir=LR;
  fontname="sans-serif";
  node [shape=box, style="rounded,filled", fontname="sans-serif", fontsize=11];
  edge [fontname="sans-serif", fontsize=9];
\n`;

let clusterIdx = 0;
for (const [dir, dirNodes] of groups.entries()) {
    dot += `  subgraph cluster_${clusterIdx++} {\n`;
    dot += `    label="${dir}";\n`;
    dot += `    style="rounded,filled";\n`;
    dot += `    fillcolor="#f8fafc";\n`;
    dot += `    color="#cbd5e1";\n`;
    for (const n of dirNodes) {
        const label = n.startsWith(dir + '/') ? n.slice(dir.length + 1) : n;
        dot += `    "${n}" [label="${label}", ${getNodeStyle(n)}];\n`;
    }
    dot += `  }\n\n`;
}

// 去除重複連線
const uniqueEdges = new Set();
for (const e of edges) {
    const key = `${e.from}->${e.to}:${e.type}`;
    if (uniqueEdges.has(key)) continue;
    uniqueEdges.add(key);
    dot += `  "${e.from}" -> "${e.to}" [${getEdgeStyle(e.type)}];\n`;
}

dot += `}\n`;
process.stdout.write(dot);