import React from 'react';

const SkeletonLoader = ({ variant = 'card', theme = 'light' }) => {
  const shimmerClass = theme === 'dark' ? 'shimmer-dark' : 'shimmer';
  const bgClass = theme === 'dark' ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-100';

  if (variant === 'dashboard') {
    return (
      <div className="space-y-6 animate-fade-in w-full">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className={`h-8 w-64 rounded-lg ${shimmerClass}`}></div>
            <div className={`h-4 w-96 rounded-lg ${shimmerClass}`}></div>
          </div>
          <div className={`h-10 w-32 rounded-lg ${shimmerClass}`}></div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`rounded-xl p-5 border ${bgClass}`}>
              <div className="flex items-start justify-between">
                <div className="space-y-3 w-full">
                  <div className={`h-3 w-24 rounded ${shimmerClass}`}></div>
                  <div className={`h-8 w-16 rounded ${shimmerClass}`}></div>
                  <div className={`h-3 w-32 rounded ${shimmerClass}`}></div>
                </div>
                <div className={`h-8 w-8 rounded-lg ${shimmerClass}`}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts/Content Area Skeleton */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className={`lg:col-span-2 rounded-xl p-5 border ${bgClass}`}>
            <div className={`h-4 w-40 rounded mb-6 ${shimmerClass}`}></div>
            <div className={`h-48 w-full rounded-lg ${shimmerClass}`}></div>
          </div>
          <div className={`rounded-xl p-5 border ${bgClass}`}>
            <div className={`h-4 w-40 rounded mb-6 ${shimmerClass}`}></div>
            <div className="flex justify-center items-center h-48">
              <div className={`h-40 w-40 rounded-full ${shimmerClass}`}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`space-y-6 animate-fade-in w-full`}>
        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div className="space-y-2">
            <div className={`h-8 w-64 rounded-lg ${shimmerClass}`}></div>
            <div className={`h-4 w-96 rounded-lg ${shimmerClass}`}></div>
          </div>
          <div className={`h-10 w-32 rounded-lg ${shimmerClass}`}></div>
        </div>

        <div className={`rounded-xl border ${bgClass} overflow-hidden w-full`}>
          {/* Table Header/Toolbar */}
          <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className={`h-10 w-full lg:flex-1 rounded-lg ${shimmerClass}`}></div>
              <div className={`h-10 w-40 rounded-lg ${shimmerClass}`}></div>
              <div className={`h-10 w-40 rounded-lg ${shimmerClass}`}></div>
            </div>
          </div>
          
          {/* Table rows */}
          <div className="divide-y divide-gray-800/50">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`h-10 w-10 rounded-full flex-shrink-0 ${shimmerClass}`}></div>
                  <div className="space-y-2 w-full max-w-[200px]">
                    <div className={`h-4 w-full rounded ${shimmerClass}`}></div>
                    <div className={`h-3 w-3/4 rounded ${shimmerClass}`}></div>
                  </div>
                </div>
                <div className="hidden md:block flex-1">
                  <div className={`h-4 w-3/4 rounded ${shimmerClass}`}></div>
                </div>
                <div className="hidden md:block flex-1">
                  <div className={`h-6 w-24 rounded-full ${shimmerClass}`}></div>
                </div>
                <div className={`h-8 w-24 rounded-lg flex-shrink-0 ${shimmerClass}`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-4 w-full animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div className="space-y-2">
            <div className={`h-8 w-64 rounded-lg ${shimmerClass}`}></div>
            <div className={`h-4 w-96 rounded-lg ${shimmerClass}`}></div>
          </div>
          <div className={`h-10 w-32 rounded-lg ${shimmerClass}`}></div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className={`rounded-xl p-5 border ${bgClass}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-2">
                <div className={`h-6 w-48 rounded ${shimmerClass}`}></div>
                <div className={`h-4 w-32 rounded ${shimmerClass}`}></div>
              </div>
              <div className={`h-6 w-24 rounded-full ${shimmerClass}`}></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="space-y-2">
                  <div className={`h-3 w-16 rounded ${shimmerClass}`}></div>
                  <div className={`h-4 w-24 rounded ${shimmerClass}`}></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default 'card' variant
  return (
    <div className={`rounded-xl p-6 border ${bgClass} w-full animate-fade-in`}>
      <div className={`h-6 w-1/3 rounded mb-4 ${shimmerClass}`}></div>
      <div className={`h-4 w-2/3 rounded mb-6 ${shimmerClass}`}></div>
      <div className="space-y-3">
        <div className={`h-4 w-full rounded ${shimmerClass}`}></div>
        <div className={`h-4 w-full rounded ${shimmerClass}`}></div>
        <div className={`h-4 w-5/6 rounded ${shimmerClass}`}></div>
      </div>
      <div className="flex gap-3 mt-6">
        <div className={`h-10 w-24 rounded-lg ${shimmerClass}`}></div>
        <div className={`h-10 w-24 rounded-lg ${shimmerClass}`}></div>
      </div>
    </div>
  );
};

export default SkeletonLoader;
