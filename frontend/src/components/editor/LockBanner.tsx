export function LockBanner({ lockedByName }: { lockedByName: string }) {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
      SE travada por <strong>{lockedByName}</strong> — visualização somente leitura.
    </div>
  );
}
