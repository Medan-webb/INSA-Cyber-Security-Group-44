'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Methodology {
  id: number;
  name: string;
  description: string;
  commands: string[];
  steps: any[];
}

interface SharedMethodology {
  id: string;
  title: string;
  description: string;
  methodology_data: Methodology;
  author: string;
  tags: string[];
  likes: number;
  downloads: number;
  comments: any[];
  created_at: number;
  updated_at: number;
  is_public: boolean;
}

interface PopularTag {
  tag: string;
  count: number;
}

// Add this fetchJSON function since it's missing
async function fetchJSON(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status} ${res.statusText} - ${text}`);
    }
    return await res.json();
  } catch (e) {
    console.error(e);
    throw e;
  }
}

export default function SharePage() {
  const router = useRouter();
  const [methodologies, setMethodologies] = useState<Methodology[]>([]);
  const [sharedMethodologies, setSharedMethodologies] = useState<SharedMethodology[]>([]);
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [selectedMethodology, setSelectedMethodology] = useState<SharedMethodology | null>(null);
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const apiBase = "http://127.0.0.1:5000";

  const [shareForm, setShareForm] = useState({
    methodologyId: '',
    title: '',
    description: '',
    author: '',
    tags: [] as string[],
  });

  const [tagInput, setTagInput] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    sortBy: 'updated_at',
    tags: [] as string[],
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });

  const [newComment, setNewComment] = useState({
    author: '',
    content: '',
  });

  useEffect(() => {
    loadMethodologies();
    loadUserMethodologies();
    loadPopularTags();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
      loadMethodologies();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters.search, filters.sortBy, filters.tags]);

  useEffect(() => {
    loadMethodologies();
  }, [pagination.page]);

  const loadUserMethodologies = async () => {
    try {
      const data = await fetchJSON(`${apiBase}/methodologies`);
      setMethodologies(data || []);
    } catch (error) {
      console.error('Failed to load methodologies:', error);
    }
  };

  const loadMethodologies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort_by: filters.sortBy,
      });

      if (filters.search) {
        params.append('search', filters.search);
      }

      if (filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','));
      }

      console.log('Fetching shared methodologies...');
      const response = await fetch(`${apiBase}/api/shared-methodologies?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      // Handle different response structures
      if (data && Array.isArray(data.methodologies)) {
        setSharedMethodologies(data.methodologies);
        setPagination(prev => ({
          ...prev,
          total: data.total || 0,
          totalPages: data.total_pages || 1,
        }));
      } else if (Array.isArray(data)) {
        // If the API returns just an array
        setSharedMethodologies(data);
        setPagination(prev => ({
          ...prev,
          total: data.length,
          totalPages: Math.ceil(data.length / pagination.limit),
        }));
      } else {
        console.warn('Unexpected API response structure:', data);
        setSharedMethodologies([]);
      }
    } catch (error) {
      console.error('Failed to load shared methodologies:', error);
      setSharedMethodologies([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPopularTags = async () => {
    try {
      const response = await fetch(`${apiBase}/api/popular-tags?limit=15`);
      const data = await response.json();
      setPopularTags(data || []);
    } catch (error) {
      console.error('Failed to load popular tags:', error);
    }
  };

  const shareMethodology = async (e: React.FormEvent) => {
    e.preventDefault();
    setSharing(true);

    try {
      const response = await fetch(`${apiBase}/api/share-methodology`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shareForm),
      });

      if (response.ok) {
        alert('Methodology shared successfully!');
        setShareForm({
          methodologyId: '',
          title: '',
          description: '',
          author: '',
          tags: [],
        });
        setTagInput('');
        loadMethodologies();
      } else {
        throw new Error('Failed to share methodology');
      }
    } catch (error) {
      console.error('Error sharing methodology:', error);
      alert('Failed to share methodology. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim()) {
      const tags = tagInput.split(',').map(tag => tag.trim()).filter(tag => tag);
      setShareForm(prev => ({
        ...prev,
        tags: [...prev.tags, ...tags],
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setShareForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const toggleTag = (tag: string) => {
    setFilters(prev => {
      const newTags = prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag];
      return { ...prev, tags: newTags };
    });
  };

  const likeMethodology = async (sharedId: string) => {
    try {
      const response = await fetch(`${apiBase}/api/shared-methodologies/${sharedId}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        setSharedMethodologies(prev =>
          prev.map(m =>
            m.id === sharedId ? { ...m, likes: (m.likes || 0) + 1 } : m
          )
        );
        if (selectedMethodology && selectedMethodology.id === sharedId) {
          setSelectedMethodology(prev => prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null);
        }
      }
    } catch (error) {
      console.error('Failed to like methodology:', error);
    }
  };

  const viewMethodology = async (sharedId: string) => {
    try {
      const response = await fetch(`${apiBase}/api/shared-methodologies/${sharedId}`);
      const data = await response.json();
      setSelectedMethodology(data);
    } catch (error) {
      console.error('Failed to load methodology details:', error);
    }
  };

  const adoptMethodology = async (sharedId: string) => {
    try {
      const newName = prompt('Enter a name for your adopted methodology (or keep original):');

      const response = await fetch(`${apiBase}/api/shared-methodologies/${sharedId}/adopt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_name: newName || undefined,
        }),
      });

      if (response.ok) {
        alert('Methodology adopted successfully! You can find it in your methodologies list.');

        setSharedMethodologies(prev =>
          prev.map(m =>
            m.id === sharedId ? { ...m, downloads: (m.downloads || 0) + 1 } : m
          )
        );

        if (selectedMethodology && selectedMethodology.id === sharedId) {
          setSelectedMethodology(prev => prev ? { ...prev, downloads: (prev.downloads || 0) + 1 } : null);
        }

        setSelectedMethodology(null);
      } else {
        throw new Error('Failed to adopt methodology');
      }
    } catch (error) {
      console.error('Error adopting methodology:', error);
      alert('Failed to adopt methodology. Please try again.');
    }
  };

  const addComment = async () => {
    if (!newComment.content.trim() || !selectedMethodology) return;

    try {
      const response = await fetch(`${apiBase}/api/shared-methodologies/${selectedMethodology.id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newComment),
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedMethodology(prev =>
          prev ? {
            ...prev,
            comments: [result.comment, ...(prev.comments || [])],
          } : null
        );
        setNewComment({ author: '', content: '' });
      } else {
        throw new Error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Methodology Sharing Community
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Share your penetration testing methodologies and discover new approaches from the community
          </p>
        </div>
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>



        {/* Browse Shared Methodologies */}
        <div>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Browse Community Methodologies</h2>

            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search methodologies..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">🔍</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="updated_at">Latest</option>
                  <option value="likes">Most Liked</option>
                  <option value="downloads">Most Downloaded</option>
                  <option value="created_at">Oldest</option>
                </select>
              </div>
            </div>

            {/* Popular Tags */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Popular Tags:</h3>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <button
                    key={tag.tag}
                    onClick={() => toggleTag(tag.tag)}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${filters.tags.includes(tag.tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                  >
                    {tag.tag} ({tag.count})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Methodology Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {sharedMethodologies && sharedMethodologies.length > 0 ? (
                  sharedMethodologies.map((methodology) => (
                    <div
                      key={methodology.id}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
                    >
                      <div className="p-6">
                        <div className="mb-4">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                            {methodology.title}
                          </h3>
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>By {methodology.author}</span>
                            <span>{formatDate(methodology.created_at)}</span>
                          </div>
                        </div>

                        <p className="text-gray-600 mb-4 line-clamp-3">
                          {methodology.description}
                        </p>

                        <div className="mb-4 text-sm text-gray-500">
                          <div><strong>Steps:</strong> {methodology.methodology_data?.steps?.length || 0} steps</div>
                          <div><strong>Commands:</strong> {methodology.methodology_data?.commands?.length || 0} commands</div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {methodology.tags?.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 cursor-pointer hover:bg-gray-200"
                              onClick={() => toggleTag(tag)}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex justify-between items-center">
                          <div className="flex gap-4 text-sm text-gray-500">
                            <button
                              onClick={() => likeMethodology(methodology.id)}
                              className="flex items-center gap-1 hover:text-red-500 transition-colors"
                            >
                              ❤️ {methodology.likes || 0}
                            </button>
                            <span className="flex items-center gap-1">
                              📥 {methodology.downloads || 0}
                            </span>
                            <button
                              onClick={() => viewMethodology(methodology.id)}
                              className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                            >
                              💬 {methodology.comments?.length || 0}
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => viewMethodology(methodology.id)}
                              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            >
                              View
                            </button>
                            <button
                              onClick={() => adoptMethodology(methodology.id)}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                              Adopt
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <div className="text-gray-500">
                      <Shield className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">No Shared Methodologies Yet</h3>
                      <p>Be the first to share a methodology with the community!</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Only show pagination if there are methodologies */}
              {sharedMethodologies && sharedMethodologies.length > 0 && pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-4">
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          {/* Methodology Detail Modal */}
          {selectedMethodology && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-semibold text-gray-900">{selectedMethodology.title}</h2>
                  <button
                    onClick={() => setSelectedMethodology(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Header Info */}
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-600"><strong>By:</strong> {selectedMethodology.author}</p>
                      <p className="text-sm text-gray-500">
                        Shared {formatDate(selectedMethodology.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>❤️ {selectedMethodology.likes || 0} likes</span>
                      <span>📥 {selectedMethodology.downloads || 0} downloads</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-600">{selectedMethodology.description}</p>
                  </div>

                  {/* Methodology Content */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900">Methodology Details</h4>

                    {/* Steps Preview */}
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">
                        Steps ({selectedMethodology.methodology_data?.steps?.length || 0})
                      </h5>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        {selectedMethodology.methodology_data?.steps?.slice(0, 5).map((step: any, index: number) => (
                          <li key={index}>{step.title || step.content}</li>
                        ))}
                        {selectedMethodology.methodology_data?.steps && selectedMethodology.methodology_data.steps.length > 5 && (
                          <li className="text-gray-500">
                            ... and {selectedMethodology.methodology_data.steps.length - 5} more steps
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Commands Preview */}
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">
                        Commands ({selectedMethodology.methodology_data?.commands?.length || 0})
                      </h5>
                      <div className="space-y-2">
                        {selectedMethodology.methodology_data?.commands?.slice(0, 3).map((cmd: string, index: number) => (
                          <code key={index} className="block bg-gray-100 px-3 py-2 rounded text-sm font-mono">
                            {cmd}
                          </code>
                        ))}
                        {selectedMethodology.methodology_data?.commands && selectedMethodology.methodology_data.commands.length > 3 && (
                          <p className="text-gray-500 text-sm">
                            ... and {selectedMethodology.methodology_data.commands.length - 3} more commands
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Comments ({selectedMethodology.comments?.length || 0})
                    </h4>

                    {/* Add Comment */}
                    <div className="mb-6">
                      <textarea
                        value={newComment.content}
                        onChange={(e) => setNewComment(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Share your thoughts about this methodology..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={newComment.author}
                          onChange={(e) => setNewComment(prev => ({ ...prev, author: e.target.value }))}
                          placeholder="Your name (optional)"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={addComment}
                          disabled={!newComment.content.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add Comment
                        </button>
                      </div>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-4">
                      {selectedMethodology.comments?.map((comment: any) => (
                        <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                          <div className="flex justify-between items-start mb-2">
                            <strong className="text-gray-900">{comment.author || 'Anonymous'}</strong>
                            <span className="text-sm text-gray-500">
                              {formatDate(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-gray-600">{comment.content}</p>
                          {comment.rating && (
                            <div className="mt-1 text-yellow-500">
                              {'⭐'.repeat(comment.rating)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 p-6 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedMethodology(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => adoptMethodology(selectedMethodology.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Adopt This Methodology
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Share Methodology Section */}
        <div className="bg-white rounded-lg shadow-md mb-12">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800">Share Your Methodology</h2>
          </div>
          <div className="p-6">
            <form onSubmit={shareMethodology} className="space-y-6">
              <div>
                <label htmlFor="methodology-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Methodology to Share
                </label>
                <select
                  id="methodology-select"
                  value={shareForm.methodologyId}
                  onChange={(e) => setShareForm(prev => ({ ...prev, methodologyId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Choose a methodology...</option>
                  {methodologies.map((methodology) => (
                    <option key={methodology.id} value={methodology.id}>
                      {methodology.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="share-title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  id="share-title"
                  type="text"
                  value={shareForm.title}
                  onChange={(e) => setShareForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Give your shared methodology a descriptive title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="share-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  id="share-description"
                  value={shareForm.description}
                  onChange={(e) => setShareForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your methodology, its strengths, and when to use it..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="share-author" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name (Optional)
                </label>
                <input
                  id="share-author"
                  type="text"
                  value={shareForm.author}
                  onChange={(e) => setShareForm(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="Anonymous"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="share-tags" className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="border border-gray-300 rounded-md p-2">
                  <input
                    id="share-tags"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add tags (press Enter to add)"
                    className="w-full px-2 py-1 border-none focus:outline-none focus:ring-0"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {shareForm.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200"
                        onClick={() => removeTag(tag)}
                      >
                        {tag} ×
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-500">Separate tags with commas or press Enter</p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sharing}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sharing ? 'Sharing...' : 'Share Methodology'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}