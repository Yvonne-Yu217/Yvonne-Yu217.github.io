// Measured diagram edges keep the graph readable as translated text reflows.
const ns = 'http://www.w3.org/2000/svg';
const makeSvg = (tag, attributes) => {
  const node = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
};
for (const [index, graph] of [...document.querySelectorAll('[data-graph]')].entries()) {
  const svg = graph.querySelector('svg');
  const arrowId = `graph-arrow-${index}`;
  const render = () => {
    const bounds = graph.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    const defs = makeSvg('defs', {});
    const marker = makeSvg('marker', {
      id: arrowId,
      viewBox: '0 0 10 10',
      refX: '9',
      refY: '5',
      markerWidth: '6',
      markerHeight: '6',
      orient: 'auto-start-reverse',
    });
    marker.append(makeSvg('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#688595' }));
    defs.append(marker);
    svg.append(defs);
    const nodes = new Map(
      [...graph.querySelectorAll('[data-node]')].map((node) => [
        node.dataset.node,
        node.getBoundingClientRect(),
      ]),
    );
    for (const edge of graph.querySelectorAll('[data-edge-from]')) {
      const source = nodes.get(edge.dataset.edgeFrom);
      const target = nodes.get(edge.dataset.edgeTo);
      if (!source || !target) continue;
      let x1, y1, x2, y2, path;
      if (target.left > source.right || target.right < source.left) {
        const forward = target.left > source.right;
        x1 = (forward ? source.right : source.left) - bounds.left;
        x2 = (forward ? target.left : target.right) - bounds.left;
        y1 = source.top + source.height / 2 - bounds.top;
        y2 = target.top + target.height / 2 - bounds.top;
        const mid = (x1 + x2) / 2;
        path = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
      } else {
        const forward = target.top > source.top;
        x1 = source.left + source.width / 2 - bounds.left;
        x2 = target.left + target.width / 2 - bounds.left;
        y1 = (forward ? source.bottom : source.top) - bounds.top;
        y2 = (forward ? target.top : target.bottom) - bounds.top;
        path = `M ${x1} ${y1} L ${x2} ${y2}`;
      }
      svg.append(
        makeSvg('path', {
          d: path,
          fill: 'none',
          stroke: '#688595',
          'stroke-width': '1.6',
          'marker-end': `url(#${arrowId})`,
        }),
      );
    }
  };
  // Keep an accessible relationship list; render arrows only when measurement works.
  render();
  graph.classList.add('graph-enhanced');
  if ('ResizeObserver' in window) new ResizeObserver(render).observe(graph);
  else window.addEventListener('resize', render);
  window.addEventListener('beforeprint', render);
}
