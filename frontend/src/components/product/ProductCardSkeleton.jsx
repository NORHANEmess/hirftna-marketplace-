export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden animate-pulse">
      <div className="aspect-square bg-beige-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-beige-200 rounded-full w-20" />
        <div className="h-3 bg-beige-200 rounded-full w-full" />
        <div className="h-3 bg-beige-200 rounded-full w-3/4" />
        <div className="h-8 bg-beige-200 rounded-xl mt-2" />
      </div>
    </div>
  );
}
