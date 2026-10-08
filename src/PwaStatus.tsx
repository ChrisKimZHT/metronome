import { useState } from 'react';
import { Button } from '@mantine/core';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PwaStatus({ playing }: { playing: boolean }) {
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('离线缓存注册失败：', error);
    },
  });

  if (!offlineReady && !needRefresh) return null;

  const dismiss = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
    setUpdateError(false);
  };
  const refresh = async () => {
    setUpdating(true);
    setUpdateError(false);
    try {
      await updateServiceWorker(true);
    } catch {
      setUpdateError(true);
    } finally {
      setUpdating(false);
    }
  };

  return <aside className="pwa-status" aria-label="应用更新">
    <p role="status">{updateError
      ? '更新失败，请稍后重试。'
      : needRefresh
        ? playing ? '新版本已就绪，停止播放后可更新。' : '新版本已就绪，更新后将刷新页面。'
        : '已可离线使用，下次断网也能打开节拍器。'}</p>
    <div className="pwa-actions">
      {needRefresh && <Button size="xs" disabled={playing} loading={updating} onClick={() => void refresh()}>立即更新</Button>}
      <Button size="xs" variant="subtle" onClick={dismiss}>{needRefresh ? '稍后' : '知道了'}</Button>
    </div>
  </aside>;
}
