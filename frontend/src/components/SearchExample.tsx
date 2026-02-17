// Example Search Component for AnoN
// This is a reference implementation showing how to use the search API

import { useState } from 'react';
import { searchPosts, ApiSearchResult } from '../services/postsApi';

// Helper to display username or fallback
const displayUsername = (username?: string, anonId?: string): string => {
    return username || `User #${anonId?.substring(0, 8) || 'unknown'}`;
};

export default function SearchExample() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ApiSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const response = await searchPosts(query, limit, 0);
      setResults(response.results);
      setTotalCount(response.total_count || 0);
      setOffset(0);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    setIsLoading(true);
    try {
      const newOffset = offset + limit;
      const response = await searchPosts(query, limit, newOffset);
      setResults([...results, ...response.results]);
      setOffset(newOffset);
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Search Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">
          Search Posts
        </h1>
        <p className="text-sm text-slate-600 dark:text-green-300/70">
          Try: "hero", "#fun", "awesome #travel #food"
        </p>
      </div>

      {/* Search Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search for posts... (e.g., hero #fun)"
          className="flex-1 px-4 py-3 rounded-xl border border-emerald-500/20 dark:border-green-500/20 
                     bg-white/60 dark:bg-black/50 text-slate-900 dark:text-green-100 
                     placeholder:text-slate-500 dark:placeholder:text-green-300/50 
                     focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:focus:ring-green-500/30"
        />
        <button
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
          className="px-6 py-3 rounded-xl font-mono border border-emerald-500/30 dark:border-green-500/30 
                     bg-emerald-500/10 dark:bg-green-500/10 text-emerald-800 dark:text-green-300 
                     hover:bg-emerald-500/20 dark:hover:bg-green-500/20 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Results Count */}
      {totalCount > 0 && (
        <div className="text-sm font-mono text-slate-600 dark:text-green-300/70">
          Found {totalCount} result{totalCount !== 1 ? 's' : ''}
        </div>
      )}

      {/* Results */}
      {results.length === 0 && !isLoading && query && (
        <div className="text-center py-8 text-slate-600 dark:text-green-300/70">
          No results found. Try a different search query.
        </div>
      )}

      <div className="space-y-4">
        {results.map((result) => {
          const timeAgo = (isoDate: string) => {
            const minutes = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
            if (minutes < 1) return 'just now';
            if (minutes < 60) return `${minutes}m ago`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h ago`;
            return `${Math.floor(hours / 24)}d ago`;
          };

          return (
            <div
              key={result.post.id}
              className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 
                         bg-white/60 dark:bg-black/50 backdrop-blur p-4 space-y-3"
            >
              {/* Post Header */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-emerald-700 dark:text-green-300">
                  {displayUsername(result.post.username, result.post.anon_id)}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-500 dark:text-green-300/60">
                    {timeAgo(result.post.created_at)}
                  </span>
                  <span className="font-mono text-xs text-emerald-600 dark:text-green-400">
                    Score: {result.relevance_score.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Post Content */}
              <p className="text-slate-800 dark:text-green-100 leading-relaxed">
                {result.post.text}
              </p>

              {/* Matched Terms */}
              {result.matched_terms && result.matched_terms.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {result.matched_terms.map((term, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-md text-xs font-mono 
                                 bg-emerald-500/10 dark:bg-green-500/10 
                                 text-emerald-700 dark:text-green-300 
                                 border border-emerald-500/20 dark:border-green-500/20"
                    >
                      {term.startsWith('#') ? term : `"${term}"`}
                    </span>
                  ))}
                </div>
              )}

              {/* Post Stats */}
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-slate-600 dark:text-green-300/70">
                  👍 {result.post.likes}
                </span>
                <span className="flex items-center gap-1 text-slate-600 dark:text-green-300/70">
                  👎 {result.post.dislikes}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {results.length > 0 && results.length < totalCount && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="px-6 py-3 rounded-xl font-mono border border-emerald-500/30 dark:border-green-500/30 
                       bg-emerald-500/10 dark:bg-green-500/10 text-emerald-800 dark:text-green-300 
                       hover:bg-emerald-500/20 dark:hover:bg-green-500/20 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
