import { useEffect, useState } from 'react';
import { healthResponseSchema, type HealthResponse } from '@recordbase/shared';

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/healthz')
      .then((res) => res.json())
      .then((json) => setHealth(healthResponseSchema.parse(json)))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 640 }}>
      <h1>recordbase</h1>
      <p>メタ駆動ノーコードアプリ作成ツール（フェーズ0：基盤疎通）</p>
      <section>
        <h2>API 疎通</h2>
        {error && <p style={{ color: 'crimson' }}>エラー: {error}</p>}
        {health ? <pre>{JSON.stringify(health, null, 2)}</pre> : !error && <p>接続中…</p>}
      </section>
    </main>
  );
}
