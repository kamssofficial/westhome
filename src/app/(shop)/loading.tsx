export default function ShopLoading() {
  return (
    <div className="min-h-screen">
      {/* Hero skeleton */}
      <div className="relative h-[85vh] bg-[#1a1917] animate-pulse" />
      
      {/* Categories skeleton */}
      <div className="container-shop py-12 md:py-20">
        <div className="mb-8 md:mb-12">
          <div className="h-8 w-48 bg-[#f0ede8] rounded-full animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-[.82] rounded-[1.35rem] bg-[#f0ede8] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
