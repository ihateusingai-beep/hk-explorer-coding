#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

let passed = 0;
let failed = 0;
function ok(name, cond, detail) {
  if (cond) {
    passed++;
    console.log('PASS', name);
  } else {
    failed++;
    console.log('FAIL', name, detail || '');
  }
}

ok('S1 title', /香港小探險家的編碼旅程/.test(html));
ok('S2 school', /將軍澳培智學校/.test(html));
ok('S3 logo', /pui_chi_logo/.test(html));
ok('S4 chars', /data-char="ming"/.test(html) && /data-char="lok"/.test(html));
ok('S5 blocks', /id="btn-f"/.test(html) && /id="btn-l"/.test(html) && /id="btn-r"/.test(html) && /id="btn-go"/.test(html));
ok('S6 no bare input', !/<input(?![^>]*type="hidden")/i.test(html));
ok('S7 touch lock', /touch-action:\s*manipulation/.test(html) && /user-select:\s*none/.test(html));
ok('S8 contextmenu', /contextmenu/.test(html));
ok('S9 sfx', /function beep\(/.test(html));
ok('S10 export', /window\.HkExplorer/.test(html));
ok('S11 LEVELS 8', (html.match(/id: 'vh-0/g) || []).length === 8);

const m = html.match(/<script>([\s\S]*?)<\/script>/);
ok('S12 script', !!m);

if (m) {
  const dom = {
    data: {},
    getElementById(id) {
      if (!this.data[id]) {
        this.data[id] = {
          id,
          style: {},
          className: '',
          value: '',
          innerHTML: '',
          textContent: '',
          disabled: false,
          classList: {
            _s: new Set(),
            add(c) {
              this._s.add(c);
            },
            remove(c) {
              this._s.delete(c);
            },
            toggle(c, on) {
              if (on === false) this._s.delete(c);
              else if (on === true) this._s.add(c);
              else if (this._s.has(c)) this._s.delete(c);
              else this._s.add(c);
            },
            contains(c) {
              return this._s.has(c);
            },
          },
          children: [],
          appendChild(c) {
            this.children.push(c);
            return c;
          },
          querySelector() {
            return null;
          },
          querySelectorAll() {
            return [];
          },
          setAttribute() {},
          addEventListener() {},
          remove() {},
        };
      }
      return this.data[id];
    },
    querySelectorAll(sel) {
      if (sel === '.screen') return [];
      if (sel === '.char-card') return [];
      return [];
    },
    querySelector() {
      return null;
    },
    createElement(tag) {
      return this.getElementById('el_' + tag + '_' + Math.random().toString(36).slice(2));
    },
    addEventListener() {},
  };

  dom.body = dom.getElementById('body');

  const sandbox = {
    window: {
      speechSynthesis: null,
      HkExplorer: null,
      AudioContext: null,
      webkitAudioContext: null,
    },
    document: dom,
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
    },
    console,
    setTimeout,
    clearTimeout,
    Math,
    Promise,
  };
  sandbox.window.document = dom;

  try {
    vm.runInNewContext(m[1], sandbox, { timeout: 5000 });
    const H = sandbox.window.HkExplorer;
    ok('L0 exists', !!H);

    if (H) {
      ok('L1 eight levels', H.LEVELS.length === 8);

      function rep(ch, n) {
        return Array(n).fill(ch);
      }

      // L1 straight 4
      ok('L1 FFFF', H.simulate(rep('F', 4), 0) === 'win');
      ok('L1 short miss', H.simulate(rep('F', 3), 0) === 'miss');
      ok('L1 overshoot fail', H.simulate(rep('F', 5), 0) === 'fail');

      // L2
      ok('L2 6F', H.simulate(rep('F', 6), 1) === 'win');

      // L3 FFF R FFF
      ok('L3 turn R', H.simulate(['F', 'F', 'F', 'R', 'F', 'F', 'F'], 2) === 'win');

      // L4 FFF L FFF
      ok('L4 turn L', H.simulate(['F', 'F', 'F', 'L', 'F', 'F', 'F'], 3) === 'win');

      // L5 FFLFFRFF
      ok('L5 zig', H.simulate(['F', 'F', 'L', 'F', 'F', 'R', 'F', 'F'], 4) === 'win');

      // L6 corridor FFFFRFFFF
      ok('L6 wall path', H.simulate(['F', 'F', 'F', 'F', 'R', 'F', 'F', 'F', 'F'], 5) === 'win');
      ok('L6 hit wall', H.simulate(['F', 'F', 'F', 'R', 'F'], 5) === 'fail');

      // L7 top-left path 5F + 5F
      ok('L7 long', H.simulate(rep('F', 5).concat(['R']).concat(rep('F', 5)), 6) === 'win');

      // L8
      ok('L8 5F', H.simulate(rep('F', 5), 7) === 'win');

      // stars
      const lv0 = H.LEVELS[0];
      ok('star3', H.starCount(lv0, lv0.optimal) === 3);
      ok('star2', H.starCount(lv0, lv0.optimal + 2) === 2);
      ok('star1', H.starCount(lv0, lv0.optimal + 3) === 1);

      // wall helper
      ok('wall true', H.isWall(H.LEVELS[5], 1, 1) === true);
      ok('wall false', H.isWall(H.LEVELS[5], 0, 0) === false);
    }
  } catch (e) {
    ok('L0 vm', false, String((e && e.stack) || e));
  }
}

console.log('---');
console.log(passed + ' passed,', failed + ' failed');
process.exit(failed ? 1 : 0);
