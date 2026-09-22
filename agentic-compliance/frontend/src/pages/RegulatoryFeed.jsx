import React, { useEffect, useState, useCallback } from 'react';
import { Rss, RefreshCw, ExternalLink, AlertTriangle, Clock, Search, Menu, Filter, ShieldCheck, Newspaper, FileText } from 'lucide-react';
import { apiFetch } from '../services/api';

// Curated high-resolution cover images relevant to SEBI (financial markets, stock charts)
const SEBI_IMAGES = [
  'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&auto=format&fit=crop&q=80', // Financial/stock market charts
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=60',  // Stock trading display
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60',  // Modern financial skyscrapers
];

// Curated high-resolution cover images relevant to RBI (banking, currency, monetary policy)
const RBI_IMAGES = [
  'https://images.unsplash.com/photo-1622151834677-70f982c9adef?w=1200&auto=format&fit=crop&q=80', // Indian Rupee Coins & Currency
  'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=800&auto=format&fit=crop&q=60',  // Classical banking architecture
  'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&auto=format&fit=crop&q=60',  // Currency notes / counting
];

const getCoverImage = (source, index) => {
  const isSebi = (source || '').toUpperCase() === 'SEBI';
  const list = isSebi ? SEBI_IMAGES : RBI_IMAGES;
  return list[index % list.length];
};

export default function RegulatoryFeed() {
  const [items, setItems] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSource, setSelectedSource] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFeed = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError('');
    try {
      const endpoint = forceRefresh ? '/feed/regulatory?refresh=true' : '/feed/regulatory';
      const data = await apiFetch(endpoint);
      setItems(data.items || []);
      setWarnings(data.warnings || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Failed to fetch regulatory feed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const filteredItems = items.filter(item => {
    const matchesSource = selectedSource === 'ALL' || (item.source || '').toUpperCase() === selectedSource;
    const matchesSearch = !searchQuery.trim() || 
      (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSource && matchesSearch;
  });

  // Featured Item is the first match
  const featuredItem = filteredItems.length > 0 ? filteredItems[0] : null;
  // Grid items are the remaining ones
  const gridItems = filteredItems.length > 1 ? filteredItems.slice(1) : filteredItems;

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 bg-slate-50/50" style={{ fontFamily: "'Outfit', sans-serif" }}>
      
      {/* Branding Header Portal Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-1.5">
          <span className="bg-slate-900 text-white px-3 py-1 rounded-lg font-black text-xs uppercase tracking-wider">News</span>
          <span className="font-semibold text-slate-800 text-sm">Portal</span>
        </div>
        
        <div className="flex items-center gap-4 text-slate-500">
          <Search className="w-4 h-4 cursor-pointer hover:text-slate-900 transition" />
          <Menu className="w-4 h-4 cursor-pointer hover:text-slate-900 transition" />
        </div>
      </div>

      {/* Warnings / Error Banners */}
      {warnings.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-[11px] text-amber-800 flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{w}</span>
            </p>
          ))}
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex gap-2 items-center font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar (Sleek Under-Header Integration) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Source Filter Pills */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['ALL', 'SEBI', 'RBI'].map((src) => (
            <button
              key={src}
              onClick={() => setSelectedSource(src)}
              className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer ${
                selectedSource === src
                  ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              {src === 'ALL' ? 'All Authorities' : src}
            </button>
          ))}
        </div>

        {/* Search input & Manual sync */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search circulars..."
              className="w-full pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-800 transition"
            />
          </div>
          
          <button
            onClick={() => fetchFeed(true)}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 border border-slate-200 rounded-xl transition cursor-pointer"
            title="Sync Live Feeds"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Feed Content Layout */}
      {loading && items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-950 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">Connecting to SEBI & RBI notification channels...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto">
            <Newspaper className="w-6 h-6 text-slate-400 opacity-60" />
          </div>
          <h3 className="text-sm font-black text-slate-800">No Notifications Match Query</h3>
          <p className="text-xs text-slate-400 font-medium">Try changing the authority filter or search keywords.</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Featured - Hot Topics Banner Card */}
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Hot Topics</h2>
            
            {featuredItem && (
              <a
                href={featuredItem.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block w-full h-[300px] md:h-[380px] rounded-3xl overflow-hidden shadow-lg border border-slate-100/50 transition-all duration-300 transform hover:scale-[1.002]"
              >
                {/* Financial/Banking Visual Match Cover */}
                <img 
                  src={getCoverImage(featuredItem.source, 0)} 
                  alt="Featured Authority Cover" 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Dark Gradient Mask */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
                
                {/* Overlay details */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 space-y-2 md:space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-rose-600 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
                      Featured {featuredItem.source}
                    </span>
                  </div>
                  
                  <h3 className="text-base md:text-xl font-black text-white leading-snug group-hover:text-slate-100 transition-colors line-clamp-2">
                    {featuredItem.title}
                  </h3>
                  
                  {featuredItem.description && (
                    <p className="text-slate-300 text-[11px] line-clamp-2 max-w-3xl font-medium leading-relaxed">
                      {featuredItem.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest pt-1">
                    <span>{featuredItem.published || 'Recently'}</span>
                    <span>•</span>
                    <span>{featuredItem.source} Live Release</span>
                  </div>
                </div>
              </a>
            )}
          </div>

          {/* Latest News - Grid Cards */}
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Latest News</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {gridItems.map((item, idx) => {
                // Cycle through matching authority cover images
                const coverImage = getCoverImage(item.source, idx + 1);
                return (
                  <a
                    key={idx}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-slate-200/60 hover:border-slate-300 hover:shadow-md transition-all duration-300"
                  >
                    {/* Visual Card Image Header */}
                    <div className="relative h-40 w-full overflow-hidden">
                      <img 
                        src={coverImage} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
                        {item.source}
                      </span>
                    </div>
                    
                    {/* Card details body */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5">
                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors line-clamp-3">
                          {item.title}
                        </h4>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 font-medium">
                            {item.description}
                          </p>
                        )}
                      </div>
                      
                      {/* Footer relative date metadata */}
                      <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest pt-2.5 border-t border-slate-100">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{item.published || 'Recently'}</span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
