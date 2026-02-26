import Link from 'next/link';

const chapters = [
  {
    title: '第一章：立足之地',
    goal: '完成 3 回合治理并保持治安 >= 60',
    tips: ['优先农业与商业，避免早期缺粮', '治安低于 50 前先安抚']
  },
  {
    title: '第二章：边境试探',
    goal: '发起 1 次实时战斗并完成回写',
    tips: ['先在战役页积累兵力后再开战', '战斗中优先守住至少两路']
  },
  {
    title: '第三章：天下布武',
    goal: '将领地推进到 10/10',
    tips: ['威望和治安决定长期上限', '避免连续失利导致国力崩盘']
  }
];

export default function TutorialPage() {
  return (
    <main className="app-shell text-zinc-100">
      <header className="panel flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-cyan-300">ONBOARDING</p>
          <h1 className="panel-title">新手引导与战役章节</h1>
        </div>
        <Link href="/" className="text-sm text-cyan-300 hover:underline">首页</Link>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        {chapters.map((c) => (
          <article key={c.title} className="panel p-4">
            <h2 className="text-base font-semibold">{c.title}</h2>
            <p className="mt-2 text-sm text-zinc-300">目标：{c.goal}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-400">
              {c.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
