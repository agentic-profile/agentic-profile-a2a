// sources:
// - https://github.com/oren/eliza-bot/blob/master/elizabot.js
// - https://github.com/brandongmwong/elizabot-js
// - https://www.masswerk.at/elizabot/

import {
    elizaQuits,
    elizaFinals,
    elizaInitials,	
    elizaPostTransforms,
} from "./eliza-constants.js";
import { init } from "./eliza-init.js";

export default class ElizaBot {
    noRandom: boolean;
    capitalizeFirstLetter: boolean = true;
    debug: boolean = false;
    memSize: number = 20;
    version: string = "1.1 (original)";
    quit: boolean = false;
    mem: any[] = [];
    lastchoice: any[] = [];
    preExp: any;
    postExp: any;
    posts: any;
    pres: any;
    sentence!: string;
    elizaKeywords: any;
    constructor(noRandomFlag:boolean) {
        this.noRandom = !!noRandomFlag;

        const { elizaKeywords, pres, posts, preExp, postExp } = init();
        this.elizaKeywords = elizaKeywords;
        this.pres = pres;
        this.posts = posts;
        this.preExp = preExp;
        this.postExp = postExp;

        this.reset();
    }

    reset() {
        this.quit = false;
        this.mem = [];
        this.lastchoice = [];
        this.sentence = "";

        for (let k = 0; k < this.elizaKeywords.length; k++) {
            this.lastchoice[k] = [];
            const rules = this.elizaKeywords[k][2] as any[];
            for (let i = 0; i < rules.length; i++) this.lastchoice[k][i] = -1;
        }
    }

    getState() {
        return {
            quit: this.quit,
            mem: this.mem,
            lastchoice: this.lastchoice,
            sentence: this.sentence,
            pres: this.pres,
            posts: this.posts,
        }
    }

    setState(state: any) {
        this.quit = state.quit;
        this.mem = state.mem;
        this.lastchoice = state.lastchoice;
        this.sentence = state.sentence;
    }   

    transform(text:string) {
        let rpl = '';
        this.quit = false;
        text = text.toLowerCase();
        text = text.replace(/@#\$%\^&\*\(\)_\+=~`\{\[\}\]\|:;<>\/\\\t/g, ' ');
        text = text.replace(/\s+-+\s+/g, '.');
        text = text.replace(/\s*[,\.\?!;]+\s*/g, '.');
        text = text.replace(/\s*\bbut\b\s*/g, '.');
        text = text.replace(/\s{2,}/g, ' ');
        const parts = text.split('.');
        for (let i = 0; i < parts.length; i++) {
            let part = parts[i];
            if (part !== '') {
                for (let q = 0; q < elizaQuits.length; q++) {
                    if (elizaQuits[q] === part) {
                        this.quit = true;
                        return this.getFinal();
                    }
                }
                let m = this.preExp.exec(part);
                if (m) {
                    let lp = '';
                    let rp = part;
                    while (m) {
                        lp += rp.substring(0, m.index) + this.pres[m[1]];
                        rp = rp.substring(m.index + m[0].length);
                        m = this.preExp.exec(rp);
                    }
                    part = lp + rp;
                }
                this.sentence = part;
                for (let k = 0; k < this.elizaKeywords.length; k++) {
                    if (part.search(new RegExp('\\b' + this.elizaKeywords[k][0] + '\\b', 'i')) >= 0) {
                        rpl = this._execRule(k);
                    }
                    if (rpl !== '') return rpl;
                }
            }
        }
        rpl = this._memGet();
        if (rpl === '') {
            this.sentence = ' ';
            const k = this._getRuleIndexByKey('xnone');
            if (k >= 0) rpl = this._execRule(k);
        }
        return rpl !== '' ? rpl : 'I am at a loss for words.';
    }

    _execRule(k:any): any {
        const rule = this.elizaKeywords[k];
        const decomps = rule[2];
        const paramre = /\(([0-9]+)\)/;
        for (let i = 0; i < decomps.length; i++) {
            const m = this.sentence.match(decomps[i][0]);
            if (m !== null) {
                const reasmbs = decomps[i][1];
                const memflag = decomps[i][2];
                let ri = this.noRandom ? 0 : Math.floor(Math.random() * reasmbs.length);
                if ((this.noRandom && this.lastchoice[k][i] > ri) || this.lastchoice[k][i] === ri) {
                    ri = ++this.lastchoice[k][i];
                    if (ri >= reasmbs.length) {
                        ri = 0;
                        this.lastchoice[k][i] = -1;
                    }
                } else {
                    this.lastchoice[k][i] = ri;
                }
                let rpl = reasmbs[ri];
                if (this.debug) alert('match:\nkey: ' + this.elizaKeywords[k][0] +
                    '\nrank: ' + this.elizaKeywords[k][1] +
                    '\ndecomp: ' + decomps[i][0] +
                    '\nreasmb: ' + rpl +
                    '\nmemflag: ' + memflag);
                if (rpl.search('^goto ', 'i') === 0) {
                    const ki = this._getRuleIndexByKey(rpl.substring(5));
                    if (ki >= 0) return this._execRule(ki);
                }
                let m1 = paramre.exec(rpl);
                if (m1) {
                    let lp = '';
                    let rp = rpl;
                    while (m1) {
                        let param = m[parseInt(m1[1])];
                        let m2 = this.postExp.exec(param);
                        if (m2) {
                            let lp2 = '';
                            let rp2 = param;
                            while (m2) {
                                lp2 += rp2.substring(0, m2.index) + this.posts[m2[1]];
                                rp2 = rp2.substring(m2.index + m2[0].length);
                                m2 = this.postExp.exec(rp2);
                            }
                            param = lp2 + rp2;
                        }
                        lp += rp.substring(0, m1.index) + param;
                        rp = rp.substring(m1.index + m1[0].length);
                        m1 = paramre.exec(rp);
                    }
                    rpl = lp + rp;
                }
                rpl = this._postTransform(rpl);
                if (memflag) this._memSave(rpl);
                else return rpl;
            }
        }
        return '';
    }

    _postTransform(s:string) {
        s = s.replace(/\s{2,}/g, ' ');
        s = s.replace(/\s+\./g, '.');
        if (elizaPostTransforms && elizaPostTransforms.length) {
            for (let i = 0; i < elizaPostTransforms.length; i += 2) {
                const pattern = elizaPostTransforms[i] as RegExp;
                const replacement = elizaPostTransforms[i + 1] as string;
                s = s.replace(pattern, replacement);
                pattern.lastIndex = 0;
            }
        }
        if (this.capitalizeFirstLetter) {
            const re = /^([a-z])/;
            const m = re.exec(s);
            if (m) s = m[0].toUpperCase() + s.substring(1);
        }
        return s;
    }

    _getRuleIndexByKey(key:string) {
        for (let k = 0; k < this.elizaKeywords.length; k++) {
            if (this.elizaKeywords[k][0] === key) return k;
        }
        return -1;
    }

    _memSave(t:any) {
        this.mem.push(t);
        if (this.mem.length > this.memSize) this.mem.shift();
    }

    _memGet() {
        if (this.mem.length) {
            if (this.noRandom) return this.mem.shift();
            else {
                const n = Math.floor(Math.random() * this.mem.length);
                let rpl = this.mem[n];
                for (let i = n + 1; i < this.mem.length; i++) this.mem[i - 1] = this.mem[i];
                this.mem.length--;
                return rpl;
            }
        }
        else return '';
    }

    getFinal() {
        if (!elizaFinals) return '';
        return elizaFinals[Math.floor(Math.random() * elizaFinals.length)];
    }

    getInitial() {
        if (!elizaInitials) return '';
        return elizaInitials[Math.floor(Math.random() * elizaInitials.length)];
    }
}
