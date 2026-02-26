'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { SyncCommand } from '@/lib/net/protocol';

export default function MultiplayerPage() {
  const [connected, setConnected] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const wsUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const u = new URL(window.location.href);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = '/ws';
    u.search = '';
    return u.toString();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const connect = () => {
      if (!wsUrl) return;
      setAttempt((x) => x + 1);
      setLogs((l) => [`尝试连接 ${wsUrl}`, ...l].slice(0, 20));
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => {
          setConnected(true);
          setLogs((l) => ['连接成功', ...l].slice(0, 20));
        };
        ws.onclose = () => {
          setConnected(false);
          setLogs((l) => ['连接关闭，准备重连', ...l].slice(0, 20));
          timer = setTimeout(connect, 1500);
        };
        ws.onerror = () => {
          setLogs((l) => ['连接错误', ...l].slice(0, 20));
        };
        ws.onmessage = (ev) => setLogs((l) => [`消息: ${String(ev.data).slice(0, 80)}`, ...l].slice(0, 20));
      } catch {
        timer = setTimeout(connect, 1500);
      }
    };

    connect();
    return () => {
      if (timer) clearTimeout(timer);
      wsRef.current?.close();
    };
  }, [wsUrl]);

  async function sendValidate() {
    const cmd: SyncCommand = { type: 'deploy', lane: 1, cardId: 'yari', ts: Date.now() };
    const res = await fetch('/api/game/command/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd)
    });
    const data = await res.json();
    setLogs((l) => [`校验返回: ${JSON.stringify(data)}`, ...l].slice(0, 20));
  }

  return (
    <main className="app-shell text-zinc-100">
      <header className="panel flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-cyan-300">SYNC LAB</p>
          <h1 className="panel-title">实时同步基础（WebSocket）</h1>
          <p className="text-xs text-zinc-400">连接状态：{connected ? '在线' : '离线'} · 重连次数：{attempt}</p>
        </div>
        <Link href="/" className="text-sm text-cyan-300 hover:underline">首页</Link>
      </header>

      <section className="panel p-4">
        <button className="chip-btn" onClick={sendValidate}>发送命令校验</button>
        <div className="mt-3 space-y-1 text-xs text-zinc-300">
          {logs.map((l, i) => (
            <p key={`${l}-${i}`}>- {l}</p>
          ))}
        </div>
      </section>
    </main>
  );
}
