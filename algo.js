// BFS vs DFS 공통 코드: 그래프 정의, 실제 탐색을 돌려 단계 기록, SVG 그리기
// index.html(인터랙티브)과 report.html(PDF용 정적 다이어그램)이 함께 사용

const GRAPH = {
  nodes: [1, 2, 3, 4, 5, 6, 7, 8],
  edges: [[1, 2], [1, 3], [2, 4], [2, 5], [5, 6], [6, 7], [7, 8], [3, 8]],
  pos: {
    1: [50, 175], 2: [140, 115], 4: [120, 45], 5: [235, 75],
    6: [330, 75], 7: [405, 135], 8: [400, 230], 3: [225, 245],
  },
  start: 1,
  goal: 8,
};

// 인접 리스트 (번호 오름차순으로 방문)
const ADJ = (() => {
  const adj = {};
  GRAPH.nodes.forEach(v => (adj[v] = []));
  GRAPH.edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
  Object.values(adj).forEach(list => list.sort((x, y) => x - y));
  return adj;
})();

const join = arr => arr.join(', ');

// 숫자 뒤 조사: 0 1 3 6 7 8은 받침이 있음(영 일 삼 육 칠 팔), 1 7 8은 ㄹ 받침
const last = x => (Array.isArray(x) ? x[x.length - 1] : x) % 10;
const J = (x, withB, noB) => x + ([0, 1, 3, 6, 7, 8].includes(last(x)) ? withB : noB);
const 은 = x => J(x, '은', '는'), 을 = x => J(x, '을', '를'), 이 = x => J(x, '이', '가');
const 로 = x => J(x, [1, 7, 8].includes(last(x)) ? '로' : '으로', '로');

function pathFrom(parent, t) {
  const path = [];
  for (let v = t; v !== undefined; v = parent[v]) path.unshift(v);
  return path;
}

// ---------------- BFS ----------------
function traceBFS() {
  const s = GRAPH.start, t = GRAPH.goal;
  const visited = new Set([s]), processed = new Set();
  const parent = {}, dist = { [s]: 0 };
  const Q = [s];
  const steps = [];
  const snap = info => steps.push({
    queue: [...Q], visited: [...visited], processed: [...processed],
    dist: { ...dist }, parent: { ...parent }, ...info,
  });

  snap({
    current: null, lines: [1, 2],
    title: '초기화',
    what: `출발 정점 ${을(s)} 방문 처리하고 큐에 넣는다. ${s}의 거리는 0이다.`,
    why: 'BFS는 출발점에서 가까운 정점부터 차례로 퍼져 나간다. 거리가 0인 출발점이 첫 번째 처리 대상이다.',
  });

  while (Q.length) {
    const u = Q.shift();
    if (u === t) {
      processed.add(u);
      const path = pathFrom(parent, t);
      snap({
        current: u, lines: [4, 5], path, done: true,
        title: `${u} 꺼냄 → 목표 도달`,
        what: `큐 맨 앞의 ${을(u)} 꺼냈더니 목표 정점이다. parent를 거꾸로 따라가면 경로는 ${path.join(' → ')}이다.`,
        why: `큐는 거리 ${dist[u] - 1} 이하인 정점을 전부 꺼낸 다음에야 거리 ${dist[u]}인 정점을 내놓는다. 그래서 목표를 처음 꺼낸 순간의 거리 ${이(dist[u])} 곧 최단 거리이다.`,
      });
      return { steps, path, processedCount: processed.size, discoveredCount: visited.size };
    }
    const added = [], skipped = [];
    for (const v of ADJ[u]) {
      if (!visited.has(v)) {
        visited.add(v); parent[v] = u; dist[v] = dist[u] + 1; Q.push(v); added.push(v);
      } else skipped.push(v);
    }
    processed.add(u);

    let what = `큐 맨 앞의 ${을(u)} 꺼낸다(거리 ${dist[u]}). `;
    if (skipped.length) what += `이웃 ${join(skipped.slice(0, -1).concat(은(skipped.at(-1))))} 이미 방문했으므로 건너뛴다. `;
    what += added.length
      ? `이웃 ${join(added.slice(0, -1).concat(을(added.at(-1))))} 방문 처리하고 거리 ${로(dist[u] + 1)} 큐 뒤에 넣는다.`
      : '새로 넣을 이웃이 없다.';

    let why;
    if (!added.length) {
      why = `${은(u)} 막다른 정점이다. BFS는 되돌아갈 필요가 없고 그냥 큐의 다음 정점으로 넘어간다.`;
    } else if (added.includes(t)) {
      why = `목표 ${을(t)} 발견했지만 이 의사코드는 꺼낼 때 목표를 검사하므로 아직 끝나지 않는다. ${은(t)} 큐에서 차례를 기다린다.`;
    } else if (dist[u] === 0) {
      why = '출발점의 이웃은 모두 거리 1이다. 큐에 넣는 순간 방문 처리해서 같은 정점이 큐에 두 번 들어가지 않게 한다.';
    } else {
      why = `큐는 먼저 넣은 것을 먼저 꺼낸다(FIFO). 새 정점은 큐 맨 뒤에 붙으므로 거리 ${dist[u]}인 정점이 모두 처리된 뒤에 거리 ${dist[u] + 1}인 정점이 처리된다.`;
    }
    snap({ current: u, lines: [4, 6, 7, 8, 9, 10, 11], added, title: `${u} 꺼냄`, what, why });
  }
  return { steps, path: null };
}

// ---------------- DFS ----------------
function traceDFS() {
  const s = GRAPH.start, t = GRAPH.goal;
  const visited = new Set(), finished = new Set();
  const parent = {}, order = {};
  const stack = [];
  const steps = [];
  let found = null, justBacktracked = null;
  const snap = info => steps.push({
    stack: [...stack], visited: [...visited], finished: [...finished],
    parent: { ...parent }, order: { ...order }, ...info,
  });

  function dfs(u, from, skippedAtFrom) {
    visited.add(u); order[u] = visited.size; stack.push(u);
    const skipNote = skippedAtFrom.length ? `${from}의 이웃 ${join(skippedAtFrom.slice(0, -1).concat(은(skippedAtFrom.at(-1))))} 이미 방문했으므로 건너뛰고, ` : '';

    if (u === t) {
      found = [...stack];
      snap({
        current: u, lines: [1, 2], path: found, done: true,
        title: `${u} 진입 → 목표 도달`,
        what: `${skipNote}${from}의 이웃 ${로(u)} 들어갔더니 목표 정점이다. 경로는 ${found.join(' → ')}이다.`,
        why: `목표에 닿은 순간 재귀 스택 [${join(found)}]이 그대로 경로이다. DFS는 처음 찾은 경로에서 멈추므로 더 짧은 길이 있어도 확인하지 않는다.`,
      });
      return true;
    }

    if (from === null) {
      snap({
        current: u, lines: [1, 3],
        title: '시작',
        what: `출발 정점 ${을(u)} 방문 처리하고 DFS(${u})를 호출한다.`,
        why: '재귀 호출 하나가 스택 한 칸을 차지한다. 지금 스택에는 출발점만 있다.',
      });
    } else {
      const rest = ADJ[from].slice(ADJ[from].indexOf(u) + 1).filter(w => !visited.has(w));
      let why = rest.length
        ? `DFS는 미방문 이웃을 하나 찾으면 ${from}의 나머지 이웃 ${join(rest.slice(0, -1).concat(은(rest.at(-1))))} 미뤄 두고 즉시 더 깊이 들어간다(재귀 호출 = 스택 push).`
        : `${from}의 이웃 중 마지막 후보이다. DFS는 갈 수 있는 한 계속 한 갈래로 깊이 들어간다(재귀 호출 = 스택 push).`;
      if (justBacktracked) why = `막다른 ${justBacktracked}에서 돌아온 뒤 ${from}의 인접 리스트를 멈췄던 자리부터 이어서 확인한 결과이다. ` + why;
      justBacktracked = null;
      snap({
        current: u, lines: [3, 4, 5, 6],
        title: `${로(u)} 진입`,
        what: `${skipNote}${from}의 다음 이웃 ${은(u)} 미방문이므로 ${로(u)} 들어간다.`,
        why,
      });
    }

    let skipped = [];
    for (const v of ADJ[u]) {
      if (visited.has(v)) { skipped.push(v); continue; }
      parent[v] = u;
      if (dfs(v, u, skipped)) return true;
      skipped = [];
    }

    stack.pop(); finished.add(u); justBacktracked = u;
    const back = stack[stack.length - 1];
    snap({
      current: back, lines: [7], from: u,
      title: `${u}에서 ${로(back)} 되돌아감`,
      what: `${u}의 이웃 ${join(ADJ[u].slice(0, -1).concat(은(ADJ[u].at(-1))))} ${ADJ[u].length > 1 ? '모두 ' : ''}이미 방문했다. 더 갈 곳이 없으므로 ${로(back)} 돌아간다.`,
      why: `막다른 길이다. DFS(${u})가 false를 반환하면서 스택에서 빠지고, 호출한 ${로(back)} 돌아가 아직 보지 않은 이웃을 이어서 확인한다.`,
    });
    return false;
  }

  dfs(s, null, []);
  return { steps, path: found, visitedCount: visited.size };
}

// ---------------- 그리기 ----------------
const COLORS = {
  dist: ['#1e40af', '#2563eb', '#60a5fa', '#bfdbfe'],
  distText: ['#fff', '#fff', '#0b1b3a', '#0b1b3a'],
  stack: '#ea580c', finished: '#a8a29e', path: '#16a34a',
  edge: '#cbd5e1', node: '#ffffff', nodeStroke: '#64748b', current: '#facc15',
  bfsTree: '#3b82f6', dfsTree: '#f97316',
};

function graphSVG(step, algo, opts = {}) {
  const P = GRAPH.pos, R = 17;
  const pathEdges = new Set();
  if (step.path) for (let i = 1; i < step.path.length; i++) {
    pathEdges.add(step.path[i - 1] + '-' + step.path[i]);
    pathEdges.add(step.path[i] + '-' + step.path[i - 1]);
  }
  const treeEdges = new Set(Object.entries(step.parent).map(([v, u]) => u + '-' + v));
  const isTree = (a, b) => treeEdges.has(a + '-' + b) || treeEdges.has(b + '-' + a);
  const visitedSet = new Set(step.visited);
  let out = `<svg viewBox="0 0 460 280" xmlns="http://www.w3.org/2000/svg" class="graph" role="img" aria-label="${algo.toUpperCase()} 단계 그래프">`;

  // DFS에서 아직 parent만 정해지고 미방문인 간선은 트리 간선으로 그리지 않음
  for (const [a, b] of GRAPH.edges) {
    const [x1, y1] = P[a], [x2, y2] = P[b];
    let color = COLORS.edge, w = 2.5, dash = '';
    if (isTree(a, b) && visitedSet.has(a) && visitedSet.has(b)) {
      color = algo === 'bfs' ? COLORS.bfsTree : COLORS.dfsTree; w = 4;
    }
    if (pathEdges.has(a + '-' + b)) { color = COLORS.path; w = 7; }
    out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"${dash}/>`;
  }

  const processed = new Set(step.processed || []);
  const onStack = new Set(step.stack || []);
  const finished = new Set(step.finished || []);
  const inQueue = new Set(step.queue || []);

  for (const v of GRAPH.nodes) {
    const [x, y] = P[v];
    let fill = COLORS.node, stroke = COLORS.nodeStroke, text = '#0f172a', sw = 2, label = '';
    if (algo === 'bfs') {
      const d = step.dist[v];
      if (d !== undefined) {
        const c = COLORS.dist[Math.min(d, 3)];
        if (processed.has(v)) { fill = c; stroke = c; text = COLORS.distText[Math.min(d, 3)]; }
        else if (inQueue.has(v)) { fill = '#fff'; stroke = c; sw = 4; }
        label = `d=${d}`;
      }
    } else {
      if (onStack.has(v)) { fill = COLORS.stack; stroke = COLORS.stack; text = '#fff'; }
      else if (finished.has(v)) { fill = COLORS.finished; stroke = COLORS.finished; text = '#fff'; }
      if (step.order[v]) label = `#${step.order[v]}`;
    }
    if (step.path && step.path.includes(v)) { stroke = COLORS.path; sw = 4; }
    if (step.current === v) {
      out += `<circle cx="${x}" cy="${y}" r="${R + 7}" fill="none" stroke="${COLORS.current}" stroke-width="5"/>`;
    }
    out += `<circle cx="${x}" cy="${y}" r="${R}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    out += `<text x="${x}" y="${y + 5.5}" text-anchor="middle" font-size="16" font-weight="700" fill="${text}">${v}</text>`;
    if (label) {
      const ly = y === P[4][1] ? y - R - 8 : y + R + 15;
      out += `<text x="${x}" y="${ly}" text-anchor="middle" font-size="12" font-weight="600" fill="#475569">${label}</text>`;
    }
  }
  const [sx, sy] = P[GRAPH.start], [gx, gy] = P[GRAPH.goal];
  out += `<text x="${sx}" y="${sy - R - 9}" text-anchor="middle" font-size="12" font-weight="700" fill="#0f172a">출발</text>`;
  out += `<text x="${gx + R + 6}" y="${gy + 4}" font-size="12" font-weight="700" fill="#0f172a">목표</text>`;
  if (algo === 'dfs' && step.from) {
    // 되돌아가는 화살표
    const [fx, fy] = P[step.from], [bx, by] = P[step.current];
    const mx = (fx + bx) / 2 - 18, my = (fy + by) / 2;
    out += `<path d="M${fx - 10},${fy + 8} Q${mx},${my} ${bx - 14},${by - 12}" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="5 4" marker-end="url(#arr-${opts.id || 'x'})"/>`;
    out += `<defs><marker id="arr-${opts.id || 'x'}" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#dc2626"/></marker></defs>`;
  }
  return out + '</svg>';
}

function boxesHTML(items, kind) {
  if (!items.length) return '<span class="empty">(비어 있음)</span>';
  return items.map(v => `<span class="box ${kind}">${v}</span>`).join('');
}

const BFS_CODE = [
  'BFS(G, s, t)',
  '    visited[s] = true',
  '    Q.enqueue(s)',
  '    while Q not empty',
  '        u = Q.dequeue()            // 가장 먼저 들어온 정점',
  '        if u == t: return path(parent, t)',
  '        for v in adj[u]',
  '            if not visited[v]',
  '                visited[v] = true  // 넣을 때 방문 처리',
  '                parent[v] = u',
  '                dist[v] = dist[u] + 1',
  '                Q.enqueue(v)',
];
// lines 인덱스: 1=visited[s], 2=enqueue, 3=while, 4=dequeue, 5=if goal, 6=for, 7=if, 8~11=body
const DFS_CODE = [
  'DFS(G, u, t)',
  '    visited[u] = true',
  '    if u == t: return true',
  '    for v in adj[u]',
  '        if not visited[v]',
  '            parent[v] = u',
  '            if DFS(G, v, t): return true  // 깊게 먼저',
  '    return false                       // 막히면 되돌아감',
];
