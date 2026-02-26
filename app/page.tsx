'use client';

import { MotionConfig, motion } from 'framer-motion';
import { Bot, Castle, Swords } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <MotionConfig reducedMotion="user">
      <main className="mx-auto min-h-screen w-full max-w-6xl p-6 md:p-10">
        <section className="rounded-2xl border border-cyan-400/20 bg-zinc-900/70 p-6 shadow-[0_0_60px_rgba(34,211,238,0.12)] md:p-10">
          <p className="text-xs tracking-[0.22em] text-cyan-300/80">SINON WARRING STATES</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-5xl">天下布武 · Web 战略模拟</h1>
          <p className="mt-4 max-w-2xl text-sm text-zinc-300 md:text-base">以战国时代为舞台，调控人口、经济、军备与外交，在多势力 AI 对抗中完成统一。</p>
          <div className="mt-6 flex gap-3">
            <Button size="lg">开始征程</Button>
            <Button variant="outline" size="lg">查看路线图</Button>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: Castle, title: '内政循环', desc: '人口/粮食/税收/治安联动结算。' },
            { icon: Swords, title: '战争外交', desc: '盟约、背刺、讨伐与兵力投送。' },
            { icon: Bot, title: '敌对 AI', desc: '战略层+战役层+回合层的多势力决策。' }
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
