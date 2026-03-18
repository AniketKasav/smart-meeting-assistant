// frontend/src/pages/Search.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { searchAPI } from '../services/api';
import {
  Search as SearchIcon,
  Filter,
  Calendar,
  User,
  Smile,
  Meh,
  Frown,
  Clock,
  FileText,
  ChevronRight,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

const Search = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef(null);

  // Filters
  const [filters, setFilters] = useState({
    sentiment: '',
    participant: '',
    fromDate: '',
    toDate: '',
    meetingId: ''
  });

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== query) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  useEffect(() => {
    if (query.length >= 2) {
      fetchSuggestions(query);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const fetchSuggestions = async (q) => {
    try {
      const response = await searchAPI.getSuggestions(q);
      if (response.data.success) {
        setSuggestions(response.data.data.suggestions);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const performSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const params = { q: searchQuery };

      if (filters.sentiment) params.sentiment = filters.sentiment;
      if (filters.participant) params.participant = filters.participant;
      if (filters.fromDate) params.fromDate = filters.fromDate;
      if (filters.toDate) params.toDate = filters.toDate;
      if (filters.meetingId) params.meetingId = filters.meetingId;

      const response = await searchAPI.search(params);

      if (response.data.success) {
        setResults(response.data.data.results);
        setTotal(response.data.data.total);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
      setShowSuggestions(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query });
      performSearch();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    setSearchParams({ q: suggestion.text });
    performSearch(suggestion.text);
  };

  const clearFilters = () => {
    setFilters({
      sentiment: '',
      participant: '',
      fromDate: '',
      toDate: '',
      meetingId: ''
    });
    performSearch();
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return <Smile className="w-4 h-4 text-green-400" />;
      case 'negative':
        return <Frown className="w-4 h-4 text-red-400" />;
      default:
        return <Meh className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-400';
      case 'negative':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  const formatTimestamp = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResultClick = (result) => {
    navigate(`/meetings/${result.meetingId}?timestamp=${result.timestamp}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <SearchIcon className="w-8 h-8 text-purple-400" />
            Smart Search
          </h1>
          <p className="text-slate-400">Search across all meeting transcripts and summaries</p>
        </div>

        {/* Search Bar */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 mb-6">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search meetings, transcripts, topics..."
                className="w-full pl-12 pr-32 py-4 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setResults([]);
                      setTotal(0);
                      searchInputRef.current?.focus();
                    }}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!query.trim()}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-3 group"
                  >
                    {suggestion.type === 'meeting' && <FileText className="w-4 h-4 text-purple-400" />}
                    {suggestion.type === 'participant' && <User className="w-4 h-4 text-blue-400" />}
                    {suggestion.type === 'topic' && <SearchIcon className="w-4 h-4 text-green-400" />}
                    <span className="text-white group-hover:text-purple-400 transition-colors">
                      {suggestion.text}
                    </span>
                    <span className="ml-auto text-xs text-slate-500 capitalize">{suggestion.type}</span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Filters Toggle */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Advanced Filters</span>
              {(filters.sentiment || filters.participant || filters.fromDate || filters.toDate) && (
                <span className="ml-2 px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                  Active
                </span>
              )}
            </button>

            {total > 0 && (
              <span className="text-sm text-slate-400">
                Found {total} result{total !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Sentiment Filter */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Sentiment</label>
                <select
                  value={filters.sentiment}
                  onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All</option>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
              </div>

              {/* Participant Filter */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Participant</label>
                <input
                  type="text"
                  value={filters.participant}
                  onChange={(e) => setFilters({ ...filters, participant: e.target.value })}
                  placeholder="Name or ID"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* From Date */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">From Date</label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* To Date */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">To Date</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Clear Filters */}
              {(filters.sentiment || filters.participant || filters.fromDate || filters.toDate) && (
                <div className="col-span-full">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : results.length === 0 && query ? (
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-12 text-center">
            <AlertCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Results Found</h3>
            <p className="text-slate-400">
              Try adjusting your search query or filters
            </p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                onClick={() => handleResultClick(result)}
                className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 hover:border-purple-500/50 transition-all cursor-pointer group"
              >
                {/* Meeting Info */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors flex items-center gap-2">
                      {result.meetingTitle}
                      <ChevronRight className="w-4 h-4" />
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(result.meetingDate), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {result.speaker}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatTimestamp(result.timestamp)}
                      </span>
                      <span className={`flex items-center gap-1 ${getSentimentColor(result.sentiment)}`}>
                        {getSentimentIcon(result.sentiment)}
                        {result.sentiment}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Search Result Context */}
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p
                    className="text-slate-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: result.context }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-12 text-center">
            <SearchIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Start Searching</h3>
            <p className="text-slate-400">
              Enter a search query to find relevant meetings and transcripts
            </p>
          </div>
        )}
      </div>

      <style>{`
        mark {
          background-color: rgba(168, 85, 247, 0.3);
          color: #e9d5ff;
          padding: 2px 4px;
          border-radius: 4px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default Search;