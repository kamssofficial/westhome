export default function CollectionLoading() {
  return (
    <div className="container-shop py-6 md:py-10 animate-pulse">
      {/* Title skeleton */}
      <div className="mb-6">
        <div className="h-8 w-48 bg-[#f0ede8] rounded-full" />
      </div>
      
      {/* Filter bar skeleton */}
      <div className="flex gap-3 mb-6">
        <div className="h-10 w-20 bg-[#f0ede8] rounded-full" />
        <div className="h-10 w-20 bg-[#f0ede8] rounded-full" />
        <div className="h-10 w-20 bg-[#f0ede8] rounded-full" />
      </div>
      
      {/* Product grid skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i}>
            <div className="aspect-square rounded-[1.35rem] bg-[#f0ede8] mb-3" />
            <div className="h-4 w-3/4 bg-[#f0ede8] rounded-full mb-2" />
            <div className="h-4 w-1/2 bg-[#f0ede8] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
