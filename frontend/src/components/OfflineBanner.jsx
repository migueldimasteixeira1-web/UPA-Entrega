import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../lib/useOnlineStatus';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-[200] bg-amber-600 text-white text-sm font-medium px-4 py-2 flex items-center justify-center gap-2 shadow-md"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      Sem conexão com a internet
    </div>
  );
}
