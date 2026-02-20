// Simple markdown → HTML renderer

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function processInline(text: string, images?: Record<string, { name: string, data: string }>): string {
    let r = text;
    // Escape backslash sequences
    r = r.replace(/\\([\\`*_{}[\]()#+\-.!~|])/g, (_, ch) => `&#${ch.charCodeAt(0)};`);
    // Images with db-image support
    r = r.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_match, alt, url, title) => {
        let src = url;
        if (url.startsWith('db-image://') && images) {
            const id = url.replace('db-image://', '');
            if (images[id]) src = images[id].data;
        }
        return `<img src="${src}" alt="${alt}" title="${title || ''}" class="md-img" />`;
    });
    // Links
    r = r.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, '<a href="$2" title="$3" target="_blank" rel="noopener" class="md-link">$1</a>');
    // Auto-links
    r = r.replace(/<(https?:\/\/[^>]+)>/g, '<a href="$1" target="_blank" rel="noopener" class="md-link">$1</a>');
    // Inline code
    r = r.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');
    // Bold italic
    r = r.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    // Bold
    r = r.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    r = r.replace(/__(.+?)__/g, '<strong>$1</strong>');
    // Italic
    r = r.replace(/\*(.+?)\*/g, '<em>$1</em>');
    r = r.replace(/_(.+?)_/g, '<em>$1</em>');
    // Strikethrough
    r = r.replace(/~~(.+?)~~/g, '<del>$1</del>');
    // Line break (two spaces at end)
    r = r.replace(/ {2,}\n/g, '<br/>');
    return r;
}

function processTable(lines: string[], images?: Record<string, { name: string, data: string }>): string {
    if (lines.length < 2) return '';
    const headerCells = lines[0].split('|').map(c => c.trim()).filter(Boolean);
    const alignLine = lines[1];
    const aligns = alignLine.split('|').map(c => c.trim()).filter(Boolean).map(c => {
        if (c.startsWith(':') && c.endsWith(':')) return 'center';
        if (c.endsWith(':')) return 'right';
        return 'left';
    });
    let html = '<table class="md-table"><thead><tr>';
    headerCells.forEach((c, i) => {
        html += `<th style="text-align:${aligns[i] || 'left'}">${processInline(c, images)}</th>`;
    });
    html += '</tr></thead><tbody>';
    for (let i = 2; i < lines.length; i++) {
        const cells = lines[i].split('|').map(c => c.trim()).filter(Boolean);
        html += '<tr>';
        cells.forEach((c, j) => {
            html += `<td style="text-align:${aligns[j] || 'left'}">${processInline(c, images)}</td>`;
        });
        html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
}

export function renderMarkdown(md: string, images?: Record<string, { name: string, data: string }>): string {
    if (!md) return '';
    const lines = md.split('\n');
    const blocks: string[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Code block
        if (line.startsWith('```')) {
            const lang = line.slice(3).trim();
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
            }
            i++; // skip closing ```
            blocks.push(`<pre class="md-pre"><code class="md-codeblock" data-lang="${escapeHtml(lang)}">${escapeHtml(codeLines.join('\n'))}</code></pre>`);
            continue;
        }

        // Table
        if (line.includes('|') && i + 1 < lines.length && /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[i + 1])) {
            const tableLines: string[] = [line];
            i++;
            while (i < lines.length && lines[i].includes('|')) {
                tableLines.push(lines[i]);
                i++;
            }
            blocks.push(processTable(tableLines, images));
            continue;
        }

        // Horizontal rule
        if (/^(---+|\*\*\*+|___+)\s*$/.test(line)) {
            blocks.push('<hr class="md-hr"/>');
            i++;
            continue;
        }

        // Heading
        const headMatch = line.match(/^(#{1,6})\s+(.+?)(?:\s+\{#([\w-]+)\})?\s*$/);
        if (headMatch) {
            const level = headMatch[1].length;
            const id = headMatch[3] || '';
            blocks.push(`<h${level} class="md-h${level}" ${id ? `id="${escapeHtml(id)}"` : ''}>${processInline(headMatch[2], images)}</h${level}>`);
            i++;
            continue;
        }

        // Blockquote
        if (line.startsWith('>')) {
            const quoteLines: string[] = [];
            while (i < lines.length && (lines[i].startsWith('>') || (lines[i].trim() && quoteLines.length > 0))) {
                quoteLines.push(lines[i].replace(/^>\s?/, ''));
                i++;
            }
            blocks.push(`<blockquote class="md-blockquote">${renderMarkdown(quoteLines.join('\n'), images)}</blockquote>`);
            continue;
        }

        // Task list
        if (/^[-*+]\s+\[([ xX])\]/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^[-*+]\s+\[([ xX])\]/.test(lines[i])) {
                const m = lines[i].match(/^[-*+]\s+\[([ xX])\]\s*(.*)/);
                if (m) {
                    const checked = m[1] !== ' ';
                    items.push(`<li class="md-task"><input type="checkbox" ${checked ? 'checked' : ''} disabled />${processInline(m[2], images)}</li>`);
                }
                i++;
            }
            blocks.push(`<ul class="md-tasklist">${items.join('')}</ul>`);
            continue;
        }

        // Unordered list
        if (/^[-*+]\s+/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
                items.push(`<li>${processInline(lines[i].replace(/^[-*+]\s+/, ''), images)}</li>`);
                i++;
            }
            blocks.push(`<ul class="md-ul">${items.join('')}</ul>`);
            continue;
        }

        // Ordered list
        if (/^\d+\.\s+/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
                items.push(`<li>${processInline(lines[i].replace(/^\d+\.\s+/, ''), images)}</li>`);
                i++;
            }
            blocks.push(`<ol class="md-ol">${items.join('')}</ol>`);
            continue;
        }

        // Empty line
        if (!line.trim()) {
            i++;
            continue;
        }

        // Paragraph
        const paraLines: string[] = [line];
        i++;
        while (i < lines.length && lines[i].trim() && !lines[i].startsWith('#') && !lines[i].startsWith('>') && !lines[i].startsWith('```') && !/^[-*+]\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i]) && !/^(---+|\*\*\*+|___+)\s*$/.test(lines[i])) {
            paraLines.push(lines[i]);
            i++;
        }
        blocks.push(`<p class="md-p">${processInline(paraLines.join('\n'), images)}</p>`);
    }

    return blocks.join('\n');
}
