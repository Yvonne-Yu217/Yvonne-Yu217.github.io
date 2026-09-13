const zh = document.documentElement.lang.startsWith('zh');
for (const demo of document.querySelectorAll('[data-demo="ranking"]')) {
  const input = demo.querySelector('input');
  const grid = demo.querySelector('.demo-grid');
  // Fixed synthetic labels. No production scores or resource identifiers.
  const labels = Array.from({ length: 50 }, (_, i) =>
    i < 10 ? i !== 7 : i < 25 ? i % 4 !== 0 : i % 3 === 0,
  );
  labels.forEach((idle, i) => {
    const cell = document.createElement('span');
    cell.className = `candidate-cell${idle ? '' : ' false-positive'}`;
    cell.title = `${zh ? '示意候选' : 'Synthetic candidate'} ${i + 1}`;
    grid.append(cell);
  });
  function render() {
    const k = Number(input.value);
    const correct = labels.slice(0, k).filter(Boolean).length;
    demo.querySelector('[data-budget]').textContent = k;
    demo.querySelector('[data-precision]').textContent = `${Math.round((correct / k) * 100)}%`;
    demo.querySelector('[data-reviewed]').textContent = `${k} / 50`;
    [...grid.children].forEach((cell, i) => cell.classList.toggle('selected', i < k));
  }
  input.addEventListener('input', render);
  demo.querySelector('[data-reset]').addEventListener('click', () => {
    input.value = 15;
    render();
  });
  render();
}
const profiles = zh
  ? [
      ['成长与培养', '示意画像：任职时间较短、表现逐步提高。讨论：哪些培训与项目机会能支持成长？'],
      ['关键岗位与留任', '示意画像：表现稳定、岗位经验较深。讨论：需要进一步核实哪些留任因素？'],
      [
        '岗位匹配与支持',
        '示意画像：绩效波动较大、任职时间居中。讨论：先排查岗位匹配和支持条件，而非直接给员工贴标签。',
      ],
      ['经验传承与继任', '示意画像：任职时间较长、表现稳定。讨论：如何设计知识传承与继任安排？'],
    ]
  : [
      [
        'Development opportunities',
        'Synthetic profile: shorter tenure and improving performance. Question: which learning and project opportunities could support development?',
      ],
      [
        'Retention questions',
        'Synthetic profile: consistent performance and deep role experience. Question: which retention factors should be investigated further?',
      ],
      [
        'Role fit and support',
        'Synthetic profile: variable performance and moderate tenure. Question: investigate role fit and support before assigning labels to people.',
      ],
      [
        'Knowledge transfer',
        'Synthetic profile: longer tenure and consistent performance. Question: how could knowledge transfer and succession planning be supported?',
      ],
    ];
for (const demo of document.querySelectorAll('[data-demo="segments"]')) {
  function select(button) {
    demo
      .querySelectorAll('[data-segment]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    const [title, body] = profiles[Number(button.dataset.segment) - 1];
    const output = demo.querySelector('[data-segment-output]');
    output.replaceChildren();
    const h = document.createElement('h4');
    h.textContent = title;
    const p = document.createElement('p');
    p.textContent = body;
    output.append(h, p);
  }
  demo
    .querySelectorAll('[data-segment]')
    .forEach((button) => button.addEventListener('click', () => select(button)));
  select(demo.querySelector('[data-segment][aria-pressed="true"]'));
}
const retrieval = {
  retained: zh
    ? [
        [
          '检索相关证据',
          '候选 A：“工作日六点关门。” 候选 B：“周六四点关门。” 两条都来自原文，但只有 B 回答了周六的问题。',
        ],
        [
          '验证依据与相关性',
          '保留 B：“周六四点关门。” 舍弃只说明工作日的 A。通过核验的证据与原始输入一起交给回答模型。',
        ],
        [
          '根据通过验证的证据回答',
          '不能。同一回答模型读取原始输入和保留的周六句子：四点关门，五点已经超过开放时间。',
        ],
      ]
    : [
        [
          'Retrieve relevant evidence',
          'Candidate A: “The library closes at six on weekdays.” Candidate B: “On Saturday, it closes at four.” Both come from the premise, but only B addresses Saturday.',
        ],
        [
          'Check support and relevance',
          'Keep B: “On Saturday, it closes at four.” Discard A, which only describes weekdays. Pass retained evidence alongside the original input to the answerer.',
        ],
        [
          'Answer from verified evidence',
          'No. The same answerer reads the original input plus the retained Saturday sentence: closing time is four, and five is later.',
        ],
      ],
  empty: zh
    ? [
        [
          '检索到的候选未覆盖问题',
          '候选 A：“工作日六点关门。” 候选 B：“周日闭馆。” 两条都来自原文，但没有一条说明周六。',
        ],
        [
          '没有证据通过核验',
          'A 和 B 都未回答周六的问题，因此全部舍弃。保留证据为空，进入直接回答的回退路径。',
        ],
        [
          '同一回答模型只读取原始输入',
          '不能。回退没有移除原始段落；其中仍写着周六四点关门。模型不使用被舍弃的候选证据。',
        ],
      ]
    : [
        [
          'Retrieved candidates miss the question',
          'Candidate A: “The library closes at six on weekdays.” Candidate B: “It is closed on Sunday.” Both come from the premise, but neither describes Saturday.',
        ],
        [
          'No evidence passes verification',
          'Discard A and B: neither answers the Saturday question. The retained set is empty, triggering direct-answer fallback.',
        ],
        [
          'The same answerer uses only the original input',
          'No. Fallback keeps the original passage, which still states that Saturday closing time is four. The answerer does not use the discarded candidates.',
        ],
      ],
};
for (const demo of document.querySelectorAll('[data-demo="retrieval"]')) {
  const path = demo.querySelector('[data-retrieval-path]');
  path.disabled = false;
  function select(button) {
    demo
      .querySelectorAll('[data-retrieval]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    const [title, body] = retrieval[path.value][Number(button.dataset.retrieval)];
    const output = demo.querySelector('[data-retrieval-output]');
    output.replaceChildren();
    const h = document.createElement('h4');
    h.textContent = title;
    const p = document.createElement('p');
    p.textContent = body;
    output.append(h, p);
  }
  demo
    .querySelectorAll('[data-retrieval]')
    .forEach((button) => button.addEventListener('click', () => select(button)));
  path.addEventListener('change', () =>
    select(demo.querySelector('[data-retrieval][aria-pressed="true"]')),
  );
  select(demo.querySelector('[data-retrieval][aria-pressed="true"]'));
}
