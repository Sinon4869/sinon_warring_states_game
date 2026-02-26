'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Summary = {
  total: number;
  byName: Record<string, number>;
  latest: Array<{ name: string; at: number }>;
};

export default function OpsPage() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    fetch('/api/telemetry')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null));
  }, []);

  return (
    <main className="app-shell text-zinc-100">
      <header className="panel flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-cyan-300">OPS</p>
          <h1 className="panel-title">可观测性与事件面板</h1>
        </div>
        <Link href="/" className="text-sm text-cyan-300 hover:underline">首页</Link>
      </header>

      <section className="panel p-4">
        {!data ? (
          <p className="text-sm text-zinc-400">暂无数据</p>
        ) : (
          <>
            <p className="text-sm">总事件数：{data.total}</p>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              {Object.entries(data.byName).map(([k, v]) => (
                <div key={k} className="rounded border border-zinc-700 p-2 text-sm">
                  {k}: {v}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
