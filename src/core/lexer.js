// DSL syntax highlighter -> returns an HTML string (escaped).

export function escapeHTML(str) {
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]))
}

const TOKENS = [
    { regex: /^->/, class: 'hl-arrow' },
    { regex: /^CALL_[a-zA-Z0-9_]+_[a-zA-Z0-9_]+/, class: 'hl-call' },
    { regex: /^\$[a-zA-Z0-9_]+/, class: 'hl-var' },
    { regex: /^(start|halt|end|init)\b/, class: 'hl-kw' },
    { regex: /^q\d+\b/, class: 'hl-state' },
    { regex: /^[LRN]\b/, class: 'hl-dir' },
    { regex: /^_/, class: 'hl-blank' },
    { regex: /^\d+/, class: 'hl-num' },
    { regex: /^[a-zA-Z_][a-zA-Z0-9_]*/, class: 'hl-state' },
    { regex: /^\s+/, class: '' },
    { regex: /^./, class: '' }
]

export function highlightSyntax(text) {
    if (!text) return ''
    let result = ''
    let i = 0
    const str = String(text)
    while (i < str.length) {
        let matched = false
        for (const t of TOKENS) {
            const m = str.slice(i).match(t.regex)
            if (m) {
                const fragment = escapeHTML(m[0])
                result += t.class ? `<span class="${t.class}">${fragment}</span>` : fragment
                i += m[0].length
                matched = true
                break
            }
        }
        if (!matched) {
            result += escapeHTML(str[i])
            i++
        }
    }
    return result
}

// Parse a line/segment of rules text into rule objects.
export function parseRulesText(text) {
    const rules = []
    const regex = /([a-zA-Z0-9_]+)\s+([^,\s]+(?:,[^,\s]+)*)\s*->\s*(CALL_[a-zA-Z0-9_]+_[a-zA-Z0-9_]+|[a-zA-Z0-9_]+)\s+([^,\s]+(?:,[^,\s]+)*)\s+([LRNlrn]+(?:,[LRNlrn]+)*)/g
    let m
    while ((m = regex.exec(text)) !== null) {
        rules.push({
            state: m[1],
            reads: m[2].split(','),
            nextState: m[3],
            writes: m[4].split(','),
            moves: m[5].split(',').map(s => s.toUpperCase()),
            active: true
        })
    }
    return rules
}

export function tapeToDecimal(tapeStr) {
    let bits = String(tapeStr).replace(/[^01]/g, '')
    if (!bits) return '0'
    bits = bits.replace(/^0+(?=\d)/, '')
    let dec = 0n
    for (let i = 0; i < bits.length; i++) dec = dec * 2n + BigInt(bits[i])
    return dec.toString()
}
