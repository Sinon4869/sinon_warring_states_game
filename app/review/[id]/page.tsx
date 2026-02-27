'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type TimelineItem = { at: number; name: string; lane: number; by?: string; damage: number; troop?: string };
type HeatBucket = { second: number; lane0: number; lane1: number; lane2: number };

export default function ReviewMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('');
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [heatmap, setHeatmap] = useState<HeatBucket[]>([]);

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      fetch(`/api/review/match/${p.id}`)
        .then((r) => r.json())
        .then((d) => {
          setTimeline(d.timeline ?? []);
          setHeatmap(d.heatmap?.buckets ?? []);
        })
        .catch(() => {
          setTimeline([]);
          setHeatmap([]);
        });
    });
  }, [params]);

  return (
    <main className="app-shell text-zinc-100">
      <header className="panel flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-cyan-300">MATCH REVIEW</p>
          <h1 className="panel-title">对局复盘：{id}</h1>
        </div>
        <Link href="/review" className="text-sm text-cyan-300 hover:underline">返回复盘中心</Link>
      </header>

      <section className="panel p-4">
        <h2 className="mb-2 text-base font-semibold">事件时间线</h2>
        <div className="max-h-72 space-y-1 overflow-auto text-xs text-zinc-300">
          {timeline.map((e, i) => (
            <p key={`${e.at}-${i}`}>[{new Date(e.at).toLocaleTimeString()}] {e.name} lane={e.lane} {e.troop ? `troop=${e.troop}` : ''} {e.damage ? `damage=${e.damage}` : ''}</p>
          ))}
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="mb-2 text-base font-semibold">三路线压力热力（每秒）</h2>
        <div className="space-y-1 text-xs">
          {heatmap.map((h) => (
            <div key={h.second} className="grid grid-cols-4 gap-2 rounded border border-zinc-700 p-2">
              <span>t+{h.second}s</span>
              <span>线1: {h.lane0}</span>
              <span>线2: {h.lane1}</span>
              <span>线3: {h.lane2}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
