'use client';

import Link from 'next/link';
import { MotionConfig, motion } from 'framer-motion';
import { Bot, Castle, Swords } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <MotionConfig reducedMotion="user">
      <main className="app-shell">
        <section className="panel p-5 shadow-[0_0_60px_rgba(34,211,238,0.12)] md:p-10">
          <p className="text-xs tracking-[0.22em] text-cyan-300/80">SINON WARRING STATES</p>
          <h1 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl md:text-5xl">天下布武 · Web 战略模拟</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 md:text-base">以战国时代为舞台，调控人口、经济、军备与外交，在多势力 AI 对抗中完成统一。</p>
          <div className="mt-6 flex flex-wrap gap-2 md:gap-3">
            <Button asChild size="lg">
              <Link href="/campaign">开始征程（主流程）</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/map">世界地图</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-zinc-400">说明：实时战斗由战役/地图冲突触发，避免流程断裂。辅助页面在战役内可进入。</p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: Castle, title: '内政循环', desc: '人口/粮食/税收/治安联动结算。' },
            { icon: Swords, title: '战争外交', desc: '盟约、背刺、讨伐与兵力投送。' },
            { icon: Bot, title: '敌对 AI', desc: '战略层 + 实时对战层联动决策。' }
          ].map((item) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-xl border border-cyan-400/20 bg-zinc-900/60 p-4"
            >
              <item.icon className="h-5 w-5 text-cyan-300" />
              <h2 className="mt-3 font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm text-zinc-300">{item.desc}</p>
            </motion.article>
          ))}
        </section>
      </main>
    </MotionConfig>
  );
}
