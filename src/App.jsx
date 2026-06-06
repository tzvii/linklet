import { useState } from 'react';
import { Copy, Link, Check } from 'lucide-react';

export default function URLShortener() {
  const [url, setUrl] = useState('');
  const [shortenedUrls, setShortenedUrls] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState('');

  const generateShortUrl = async () => {
    setError('');

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL (include http:// or https://)');
      return;
    }

    try {
        var r = await fetch(`${process.env.REACT_APP_API_URL ?? 'http://localhost:8000'}/create`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': process.env.REACT_APP_API_KEY,
          },
          body: JSON.stringify({ url }),
      });

      if (!r.ok) {
        setError(`Failed to shorten URL: ${r.statusText}`);
        return;
      }
    } catch (err) {
      setError(err?.message);
      return;
    }

    const { id, created } = await r.json();

    const entry = {
      id,
      original: url,
      shortened: `linklet.cc/${id}`,
      createdAt: new Date(created).toLocaleString()
    };

    setShortenedUrls([entry, ...shortenedUrls]);
    setUrl('');
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      generateShortUrl();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 mt-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Link className="w-10 h-10 text-indigo-600" />
            <h1 className="text-5xl font-bold text-gray-800">Linklet</h1>
          </div>
          <p className="text-gray-600">Shorten your URLs in seconds</p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your long URL here..."
              className="flex-1 px-6 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={generateShortUrl}
              className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
            >
              Shorten
            </button>
          </div>
          {error && (
            <p className="text-red-500 text-sm mt-3 ml-2">{error}</p>
          )}
        </div>

        {/* Results Section */}
        {shortenedUrls.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Shortened URLs</h2>
            <div className="space-y-4">
              {shortenedUrls.map((item) => (
                <div
                  key={item.id}
                  className="border-2 border-gray-100 rounded-xl p-5 hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl font-bold text-indigo-600">
                          {item.shortened}
                        </span>
                        <button
                          onClick={() => copyToClipboard(item.shortened, item.id)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Copy to clipboard"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-500" />
                          )}
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 truncate mb-1">
                        {item.original}
                      </p>
                      <p className="text-xs text-gray-400">
                        Created: {item.createdAt}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {shortenedUrls.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Link className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No URLs shortened yet. Enter one above to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}