/**
 * Deterministic seeded random data engine.
 * Given the same seed (e.g. country+month), always produces the same values.
 * This simulates a database without needing one.
 */

class SeededRandom {
  constructor(seed) {
    this.seed = this._hash(String(seed));
  }
  _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h) || 1;
  }
  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  /** Random float in [min, max] */
  float(min, max) { return min + this.next() * (max - min); }
  /** Random int in [min, max] */
  int(min, max) { return Math.floor(this.float(min, max + 1)); }
  /** Vary a base value by ±pct */
  vary(base, pct = 0.15) { return base * (1 + (this.next() * 2 - 1) * pct); }
  /** Pick from array */
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
  /** Boolean with probability */
  chance(p = 0.5) { return this.next() < p; }
}

function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
function fmtDec(n, d = 1) { return +n.toFixed(d); }
function pctStr(n) { return `${n >= 0 ? '+' : ''}${fmtDec(n)}%`; }
function deltaObj(val) { return { value: pctStr(val), up: val >= 0 }; }

/** Seasonal multiplier — peaks in Q1/Q4, dips in Q3 */
function seasonFactor(month) {
  return 1 + 0.12 * Math.sin((month - 2) * Math.PI / 6);
}

/** Year-over-year trend */
function yearTrend(year, baseYear = 2024) {
  return 1 + (year - baseYear) * 0.05;
}

module.exports = { SeededRandom, fmt, fmtDec, pctStr, deltaObj, seasonFactor, yearTrend };
