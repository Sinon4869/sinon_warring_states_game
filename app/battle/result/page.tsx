'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Settlement = {
  winner: 'player' | 'ai' | 'draw';
  reason: string;
  playerScore: number;
  aiScore: number;
  turnsUsed: number;
  mvpTroop?: string;
  keyLane?: number;
  nextHint?: 'expand' | 'fortify' | 'rest';
};

export default function BattleResultPage() {
  const [data, setData] = useState<Settlement | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('sws-battle-settlement');
    if (!raw) return;
    try {
      setData(JSON.parse(raw) as Settlement);
    } catch {
      setData(null);
    }
  }, []);

  return (
    <main className="app-shell text-zinc-100">
      <section className="panel p-4">
        <p className="text-xs tracking-[0.2em] text-cyan-300">BATTLE RESULT</p>
        <h1 className="mt-1 text-xl font-semibold">战后结算与建议</h1>

        {!data ? (
          <p className="mt-3 text-sm text-zinc-400">暂无结算数据</p>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            <p>结果：{data.winner === 'player' ? '胜利' : data.winner === 'ai' ? '失败' : '平局'}</p>
            <p>理由：{data.reason}</p>
            <p>积分：我方 {data.playerScore} / 敌方 {data.aiScore}</p>
            <p>耗时：{data.turnsUsed}s</p>
            <p>MVP兵种：{data.mvpTroop ?? 'N/A'}</p>
            <p>关键线路：第{(data.keyLane ?? 0) + 1}路</p>
            <p>建议动作：{data.nextHint === 'expand' ? '扩张追击' : data.nextHint === 'fortify' ? '加固防线' : '休整补给'}</p>
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <Link href="/campaign" className="text-cyan-300 hover:underline">返回战役决策</Link>
          <Link href="/review" className="text-cyan-300 hover:underline">查看复盘中心</Link>
        </div>
      </section>
    </main>
  );
}
