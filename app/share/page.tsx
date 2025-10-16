'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, X, Heart, Download, MessageCircle, Search, Filter, Tag, User, Send, Copy, Check } from 'lucide-react';
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

// Modal Components
const SuccessModal = ({ isOpen, onClose, title, message }: { isOpen: boolean; onClose: () => void; title: string; message: string }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 transform animate-scale-in">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="h-5 w-5 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 transition-all duration-200 font-medium"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

const ErrorModal = ({ isOpen, onClose, title, message }: { isOpen: boolean; onClose: () => void; title: string; message: string }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 transform animate-scale-in">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <X className="h-5 w-5 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 transition-all duration-200 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

const AdoptModal = ({ isOpen, onClose, onAdopt, methodologyTitle }: {
  isOpen: boolean;
  onClose: () => void;
  onAdopt: (name: string) => void;
  methodologyTitle: string;
}) => {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 transform animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Adopt Methodology</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <p className="text-gray-600 mb-4">
          Give a name for your adopted methodology or keep the original:
        </p>

        <div className="mb-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800 font-medium">Original: {methodologyTitle}</p>
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter new name (optional)"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 mb-6"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onAdopt(name)}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-200 font-medium"
          >
            Adopt
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel" }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 transform animate-scale-in">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-200 font-medium"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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

  // Modal states
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [adoptModal, setAdoptModal] = useState({ isOpen: false, methodologyId: '', methodologyTitle: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { } });

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
      showError('Load Error', 'Failed to load your methodologies. Please try again.');
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
      showError('Load Error', 'Failed to load shared methodologies. Please try again.');
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
        showSuccess('Success!', 'Methodology shared successfully with the community!');
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
      showError('Sharing Failed', 'Failed to share methodology. Please try again.');
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
      showError('Load Error', 'Failed to load methodology details. Please try again.');
    }
  };

  const handleAdoptMethodology = (sharedId: string) => {
    const methodology = sharedMethodologies.find(m => m.id === sharedId);
    if (methodology) {
      setAdoptModal({
        isOpen: true,
        methodologyId: sharedId,
        methodologyTitle: methodology.title
      });
    }
  };

  const adoptMethodology = async (newName?: string) => {
    try {
      const response = await fetch(`${apiBase}/api/shared-methodologies/${adoptModal.methodologyId}/adopt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_name: newName || undefined,
        }),
      });

      if (response.ok) {
        showSuccess('Adopted!', 'Methodology adopted successfully! You can find it in your methodologies list.');

        setSharedMethodologies(prev =>
          prev.map(m =>
            m.id === adoptModal.methodologyId ? { ...m, downloads: (m.downloads || 0) + 1 } : m
          )
        );

        if (selectedMethodology && selectedMethodology.id === adoptModal.methodologyId) {
          setSelectedMethodology(prev => prev ? { ...prev, downloads: (prev.downloads || 0) + 1 } : null);
        }

        setSelectedMethodology(null);
        setAdoptModal({ isOpen: false, methodologyId: '', methodologyTitle: '' });
      } else {
        throw new Error('Failed to adopt methodology');
      }
    } catch (error) {
      console.error('Error adopting methodology:', error);
      showError('Adoption Failed', 'Failed to adopt methodology. Please try again.');
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
        showSuccess('Comment Added', 'Your comment has been posted successfully!');
      } else {
        throw new Error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      showError('Comment Failed', 'Failed to add comment. Please try again.');
    }
  };

  // Modal helper functions
  const showSuccess = (title: string, message: string) => {
    setSuccessModal({ isOpen: true, title, message });
  };

  const showError = (title: string, message: string) => {
    setErrorModal({ isOpen: true, title, message });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <div className="min-h-screen  bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-sm border border-gray-200 mb-6">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-600">Community Platform</span>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-4">
            Methodology Sharing Community
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Share your penetration testing methodologies and discover new approaches from security professionals worldwide
          </p>
        </div>

        {/* Back Button */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="group flex items-center gap-3 text-blue-600 hover:text-blue-800 transition-colors duration-200">
            <div className="flex items-center justify-center w-8 h-8 bg-white rounded-lg shadow-sm border border-gray-200 group-hover:shadow-md transition-shadow">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span className="font-medium">Back to Dashboard</span>
          </Link>
        </div>

        {/* Browse Shared Methodologies */}
        <div className="mb-12">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-blue-400 rounded-full"></div>
              <h2 className="text-3xl font-bold text-gray-900">Browse Community Methodologies</h2>
            </div>

            {/* Enhanced Search and Filters */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Search methodologies, techniques, tools..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/50"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Filter className="h-5 w-5 text-gray-400" />
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by:</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 transition-all duration-200"
                  >
                    <option value="updated_at">Latest</option>
                    <option value="likes">Most Liked</option>
                    <option value="downloads">Most Downloaded</option>
                    <option value="created_at">Oldest</option>
                  </select>
                </div>
              </div>

              {/* Enhanced Popular Tags */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Popular Tags:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map((tag) => (
                    <button
                      key={tag.tag}
                      onClick={() => toggleTag(tag.tag)}
                      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 transform hover:scale-105 ${filters.tags.includes(tag.tag)
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                          : 'bg-white/60 text-gray-800 hover:bg-white border border-gray-300/50 hover:border-gray-400'
                        }`}
                    >
                      {tag.tag}
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${filters.tags.includes(tag.tag)
                          ? 'bg-white/20 text-white/90'
                          : 'bg-gray-100 text-gray-600'
                        }`}>
                        {tag.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Methodology Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                <p className="text-gray-500">Loading methodologies...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {sharedMethodologies && sharedMethodologies.length > 0 ? (
                  sharedMethodologies.map((methodology) => (
                    <div
                      key={methodology.id}
                      className="group bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200/60 overflow-hidden"
                    >
                      <div className="p-6">
                        {/* Header with gradient accent */}
                        <div className="mb-4 pb-4 border-b border-gray-100">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
                            {methodology.title}
                          </h3>
                          <div className="flex justify-between text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              By {methodology.author || 'Anonymous'}
                            </span>
                            <span>{formatDate(methodology.created_at)}</span>
                          </div>
                        </div>

                        <p className="text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                          {methodology.description}
                        </p>

                        <div className="flex gap-4 text-sm text-gray-500 mb-4">
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs">📋</span>
                            </div>
                            {methodology.methodology_data?.steps?.length || 0} steps
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-xs">⚡</span>
                            </div>
                            {methodology.methodology_data?.commands?.length || 0} commands
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {methodology.tags?.map((tag) => (
                            <span
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 cursor-pointer hover:bg-gray-200 transition-colors duration-200"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                          <div className="flex gap-4 text-sm">
                            <button
                              onClick={() => likeMethodology(methodology.id)}
                              className="flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all duration-200"
                            >
                              <Heart className="h-4 w-4" />
                              {methodology.likes || 0}
                            </button>
                            <span className="flex items-center gap-2 px-3 py-1 text-gray-500">
                              <Download className="h-4 w-4" />
                              {methodology.downloads || 0}
                            </span>
                            <button
                              onClick={() => viewMethodology(methodology.id)}
                              className="flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-500 transition-all duration-200"
                            >
                              <MessageCircle className="h-4 w-4" />
                              {methodology.comments?.length || 0}
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => viewMethodology(methodology.id)}
                              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleAdoptMethodology(methodology.id)}
                              className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                            >
                              Adopt
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-16">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 border border-gray-200">
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Shield className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">No Shared Methodologies Yet</h3>
                      <p className="text-gray-600 max-w-md mx-auto mb-6">
                        Be the first to share your penetration testing methodology with the community!
                      </p>
                      <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 font-medium shadow-sm">
                        Share Your First Methodology
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Pagination */}
              {sharedMethodologies && sharedMethodologies.length > 0 && pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-3">
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    ← Previous
                  </button>
                  <span className="px-4 py-2 text-sm font-medium text-gray-600 bg-white/80 rounded-lg">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Enhanced Share Methodology Section */}
        <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl shadow-lg border border-gray-200/60 mb-12 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200/60 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-gradient-to-b from-green-500 to-green-400 rounded-full"></div>
              <h2 className="text-2xl font-bold text-gray-900">Share Your Methodology</h2>
            </div>
            <p className="text-gray-600 mt-2">Contribute your expertise to help the security community</p>
          </div>

          <div className="p-8">
            <form onSubmit={shareMethodology} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <label htmlFor="methodology-select" className="block text-sm font-semibold text-gray-700 mb-3">
                    Select Methodology to Share
                  </label>
                  <select
                    id="methodology-select"
                    value={shareForm.methodologyId}
                    onChange={(e) => setShareForm(prev => ({ ...prev, methodologyId: e.target.value }))}
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/50"
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
                  <label htmlFor="share-author" className="block text-sm font-semibold text-gray-700 mb-3">
                    Your Name (Optional)
                  </label>
                  <input
                    id="share-author"
                    type="text"
                    value={shareForm.author}
                    onChange={(e) => setShareForm(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="Anonymous"
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="share-title" className="block text-sm font-semibold text-gray-700 mb-3">
                  Title *
                </label>
                <input
                  id="share-title"
                  type="text"
                  value={shareForm.title}
                  onChange={(e) => setShareForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Give your shared methodology a descriptive title"
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/50"
                  required
                />
              </div>

              <div>
                <label htmlFor="share-description" className="block text-sm font-semibold text-gray-700 mb-3">
                  Description *
                </label>
                <textarea
                  id="share-description"
                  value={shareForm.description}
                  onChange={(e) => setShareForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your methodology, its strengths, when to use it, and any special considerations..."
                  rows={4}
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/50 resize-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="share-tags" className="block text-sm font-semibold text-gray-700 mb-3">
                  Tags
                </label>
                <div className="border border-gray-300 rounded-xl p-4 bg-white/50 transition-all duration-200 focus-within:border-blue-500 focus-within:ring-3 focus-within:ring-blue-500/20">
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
                    className="w-full px-2 py-1 border-none focus:outline-none focus:ring-0 bg-transparent"
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    {shareForm.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 cursor-pointer hover:from-blue-200 hover:to-blue-100 transition-all duration-200 group"
                        onClick={() => removeTag(tag)}
                      >
                        #{tag}
                        <span className="ml-2 text-blue-600 group-hover:text-blue-800">×</span>
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500">Separate tags with commas or press Enter to add</p>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={sharing}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-xl hover:from-blue-700 hover:to-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-semibold shadow-lg shadow-green-500/25"
                >
                  {sharing ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sharing...
                    </span>
                  ) : (
                    'Share Methodology with Community'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Methodology Detail Modal */}
      {selectedMethodology && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm  flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">{selectedMethodology.title}</h2>
              <button
                onClick={() => setSelectedMethodology(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <strong>By:</strong> {selectedMethodology.author}
                  </p>
                  <p className="text-sm text-gray-500">
                    Shared {formatDate(selectedMethodology.created_at)}
                  </p>
                </div>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {selectedMethodology.likes || 0} likes
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    {selectedMethodology.downloads || 0} downloads
                  </span>
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
                      <code key={index} className="block bg-gray-100 px-3 py-2 rounded-lg text-sm font-mono">
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
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Comments ({selectedMethodology.comments?.length || 0})
                </h4>

                {/* Add Comment */}
                <div className="mb-6">
                  <textarea
                    value={newComment.content}
                    onChange={(e) => setNewComment(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Share your thoughts about this methodology..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newComment.author}
                      onChange={(e) => setNewComment(prev => ({ ...prev, author: e.target.value }))}
                      placeholder="Your name (optional)"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={addComment}
                      disabled={!newComment.content.trim()}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
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
                className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleAdoptMethodology(selectedMethodology.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                Adopt This Methodology
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modals */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, title: '', message: '' })}
        title={successModal.title}
        message={successModal.message}
      />

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
        title={errorModal.title}
        message={errorModal.message}
      />

      <AdoptModal
        isOpen={adoptModal.isOpen}
        onClose={() => setAdoptModal({ isOpen: false, methodologyId: '', methodologyTitle: '' })}
        onAdopt={adoptMethodology}
        methodologyTitle={adoptModal.methodologyTitle}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => { } })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}