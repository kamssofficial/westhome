export default function SearchLoading() {
  return (
    <div className="container-shop py-6 animate-pulse">
      {/* Search bar skeleton */}
      <div className="h-12 w-full bg-[#f0ede8] rounded-full mb-6" />
      
      {/* Results skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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
