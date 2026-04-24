import clsx from 'clsx';

export default function ProductSkeleton({ count = 12, columns = 'auto' }) {
  const skeletons = Array.from({ length: count });

  return (
    <div
      className={clsx(
        'grid gap-4 w-full',
        {
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4': columns === 'auto',
          'grid-cols-1 sm:grid-cols-2 md:grid-cols-3': columns === '3',
          'grid-cols-1 sm:grid-cols-2': columns === '2',
          'grid-cols-1': columns === '1',
        }
      )}
    >
      {skeletons.map((_, i) => (
        <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
          {/* Image Skeleton */}
          <div className="w-full h-56 bg-gradient-to-r from-cream-200 to-cream-100 animate-pulse" />

          {/* Content Skeleton */}
          <div className="p-4 space-y-3">
            {/* Seller Name */}
            <div className="h-3 w-20 bg-gradient-to-r from-cream-200 to-cream-100 rounded animate-pulse" />

            {/* Product Name */}
            <div className="space-y-2">
              <div className="h-4 bg-gradient-to-r from-cream-200 to-cream-100 rounded animate-pulse" />
              <div className="h-4 w-4/5 bg-gradient-to-r from-cream-200 to-cream-100 rounded animate-pulse" />
            </div>

            {/* Rating */}
            <div className="h-3 w-24 bg-gradient-to-r from-cream-200 to-cream-100 rounded animate-pulse" />

            {/* Price */}
            <div className="h-4 w-32 bg-gradient-to-r from-cream-200 to-cream-100 rounded animate-pulse" />

            {/* Button */}
            <div className="h-10 bg-gradient-to-r from-cream-200 to-cream-100 rounded-lg animate-pulse mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
}
