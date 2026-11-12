/** Binary min-heap of integer ids keyed by priority. */
export class Heap {
  readonly i: number[] = [];
  readonly p: number[] = [];
  get size(): number { return this.i.length; }
  clear(): void { this.i.length = 0; this.p.length = 0; }
  push(id: number, pr: number): void {
    const I = this.i, P = this.p;
    let k = I.length;
    I.push(id); P.push(pr);
    while (k > 0) {
      const q = (k - 1) >> 1;
      if (P[q] <= pr) break;
      I[k] = I[q]; P[k] = P[q]; k = q;
    }
    I[k] = id; P[k] = pr;
  }
  pop(): number {
    const I = this.i, P = this.p, top = I[0], li = I.pop()!, lp = P.pop()!, n = I.length;
    if (n > 0) {
      let k = 0;
      for (;;) {
        let c = 2 * k + 1;
        if (c >= n) break;
        if (c + 1 < n && P[c + 1] < P[c]) c++;
        if (P[c] >= lp) break;
        I[k] = I[c]; P[k] = P[c]; k = c;
      }
      I[k] = li; P[k] = lp;
    }
    return top;
  }
}
