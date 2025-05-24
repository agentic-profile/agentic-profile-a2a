import {
    ElizaKeywords, 
    ElizaSynons,
    ElizaPres,
    ElizaPosts
} from "./eliza-constants.js";

export function init() {
    // make a copy
    const elizaKeywords = JSON.parse(JSON.stringify(ElizaKeywords));

    const synPatterns = {} as any;
    for (const i in ElizaSynons) {
        synPatterns[i] = '(' + i + '|' + ElizaSynons[i as keyof typeof ElizaSynons].join('|') + ')';
    }

    const sre = /@(\S+)/;
    const are = /(\S)\s*\*\s*(\S)/;
    const are1 = /^\s*\*\s*(\S)/;
    const are2 = /(\S)\s*\*\s*$/;
    const are3 = /^\s*\*\s*$/;
    const wsre = /\s+/g;
    for (let k = 0; k < elizaKeywords.length; k++) {
        const rules = elizaKeywords[k][2] as any[];
        elizaKeywords[k][3] = k;
        for (let i = 0; i < rules.length; i++) {
            const r = rules[i];
            if (r[0].charAt(0) === '$') {
                let ofs = 1;
                while (r[0].charAt(ofs) === ' ') ofs++;
                r[0] = r[0].substring(ofs);
                r[2] = true;
            } else {
                r[2] = false;
            }
            let m = sre.exec(r[0]);
            while (m) {
                const sp = synPatterns[m[1]] ? synPatterns[m[1]] : m[1];
                r[0] = r[0].substring(0, m.index) + sp + r[0].substring(m.index + m[0].length);
                m = sre.exec(r[0]);
            }
            if (are3.test(r[0])) {
                r[0] = '\\s*(.*)\\s*';
            } else {
                m = are.exec(r[0]);
                if (m) {
                    let lp = '';
                    let rp = r[0];
                    while (m) {
                        lp += rp.substring(0, m.index + 1);
                        if (m[1] !== ')') lp += '\\b';
                        lp += '\\s*(.*)\\s*';
                        if (m[2] !== '(' && m[2] !== '\\') lp += '\\b';
                        lp += m[2];
                        rp = rp.substring(m.index + m[0].length);
                        m = are.exec(rp);
                    }
                    r[0] = lp + rp;
                }
                m = are1.exec(r[0]);
                if (m) {
                    let lp = '\\s*(.*)\\s*';
                    if (m[1] !== ')' && m[1] !== '\\') lp += '\\b';
                    r[0] = lp + r[0].substring(m.index - 1 + m[0].length);
                }
                m = are2.exec(r[0]);
                if (m) {
                    let lp = r[0].substring(0, m.index + 1);
                    if (m[1] !== '(') lp += '\\b';
                    r[0] = lp + '\\s*(.*)\\s*';
                }
            }
            r[0] = r[0].replace(wsre, '\\s+');
            wsre.lastIndex = 0;
        }
    }
    elizaKeywords.sort( sortKeywords );

    let a = [];
    const pres = {} as any;
    for (let i = 0; i < ElizaPres.length; i += 2) {
        a.push(ElizaPres[i]);
        pres[ElizaPres[i]] = ElizaPres[i + 1];
    }
    const preExp = new RegExp('\\b(' + a.join('|') + ')\\b');

    a = [];
    const posts = {} as any;
    for (let i = 0; i < ElizaPosts.length; i += 2) {
        a.push(ElizaPosts[i]);
        posts[ElizaPosts[i]] = ElizaPosts[i + 1];
    }
    const postExp = new RegExp('\\b(' + a.join('|') + ')\\b');

    return {
        elizaKeywords,
        pres,
        posts,
        preExp,
        postExp
    }
}

function sortKeywords(a: any, b: any) {
    if (a[1] > b[1]) return -1
    else if (a[1] < b[1]) return 1
    else if (a[3] > b[3]) return 1
    else if (a[3] < b[3]) return -1
    else return 0;
}
