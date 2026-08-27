export default function ProductLoading() {
  return (
    <div className="container-shop py-6 md:py-10 animate-pulse">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Image skeleton */}
        <div className="aspect-square rounded-[1.35rem] bg-[#f0ede8]" />
        
        {/* Details skeleton */}
        <div className="flex flex-col gap-4 py-4">
          <div className="h-4 w-24 bg-[#f0ede8] rounded-full" />
          <div className="h-8 w-3/4 bg-[#f0ede8] rounded-full" />
          <div className="h-6 w-32 bg-[#f0ede8] rounded-full" />
          <div className="h-20 w-full bg-[#f0ede8] rounded-xl mt-4" />
          <div className="h-12 w-full bg-[#f0ede8] rounded-full mt-4" />
        </div>
      </div>
    </div>
  );
}
