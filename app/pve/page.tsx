'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { PVE_STAGES } from '@/lib/game/pve';

export default function PvePage() {
  const [chapter, setChapter] = useState<number>(1);

  const list = useMemo(() => PVE_STAGES.filter((x) => x.chapter === chapter), [chapter]);

  return (
    <main className="app-shell text-zinc-100">
      <header className="panel flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-cyan-300">PVE CAMPAIGN</p>
          <h1 className="text-xl font-semibold">关卡战役</h1>
          <p className="text-xs text-zinc-400">共 10 关，按章节推进难度。</p>
        </div>
        <Link href="/" className="text-sm text-cyan-300 hover:underline">返回首页</Link>
      </header>

      <section className="panel p-4">
        <div className="mb-3 flex gap-2">
          {[1, 2, 3].map((c) => (
            <button key={c} onClick={() => setChapter(c)} className={`chip-btn ${chapter === c ? 'border-cyan-400/70 text-cyan-300' : ''}`}>
              第 {c} 章
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {list.map((stage) => (
            <article key={stage.id} className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
              <p className="text-xs text-cyan-300">{stage.id.toUpperCase()}</p>
              <h2 className="mt-1 text-base font-semibold">{stage.name}</h2>
              <p className="mt-1 text-sm text-zinc-400">{stage.desc}</p>
              <p className="mt-2 text-xs text-zinc-500">AI: {stage.aiPersona} · 时间: {stage.timeLimit}s · 本阵: {stage.playerCore}/{stage.aiCore}</p>
              <Link href={`/battle?mode=pve&stage=${stage.id}`} className="mt-3 inline-block text-sm text-cyan-300 hover:underline">进入关卡</Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
