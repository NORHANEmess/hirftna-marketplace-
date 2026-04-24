import clsx from 'clsx';
import ProductCard from './ProductCard';
import ProductSkeleton from './ProductSkeleton';

export default function ProductGrid({
  products = [],
  loading = false,
  onWishlistToggle,
  columns = 'auto'
}) {
  // Ensure products is always an array
  const productList = Array.isArray(products)
    ? products
    : (products?.items || products?.data || []);

  if (loading) {
    return <ProductSkeleton columns={columns} />;
  }

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
      {productList.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onWishlistToggle={onWishlistToggle}
        />
      ))}
    </div>
  );
}
