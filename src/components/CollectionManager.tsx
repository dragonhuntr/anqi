import React, { useState } from 'react';
import { Folder, Edit, Trash2, Plus, Play, Maximize2, Minimize2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { FlashcardCollection, CollectionManagerProps, CollectionFormData, ViewMode } from '../types';

export function CollectionManager({ onViewModeChange }: CollectionManagerProps) {
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [formData, setFormData] = useState<CollectionFormData>({
    name: '',
    topic: '',
  });

  const {
    collections,
    currentCollection,
    addCollection,
    editCollection,
    deleteCollection,
    setCurrentCollection,
  } = useStore();

  const handleViewModeChange = (mode: ViewMode, collectionId: string) => {
    setCurrentCollection(collectionId);
    onViewModeChange(mode);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.topic.trim()) return;

    if (editingId) {
      editCollection(editingId, formData.name, formData.topic);
      setEditingId(null);
    } else {
      addCollection(formData.name, formData.topic);
      setIsAdding(false);
    }

    setFormData({ name: '', topic: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold dark:text-white">Collections</h2>
        <div className="flex gap-2">
          <button
            onClick={handleFullscreen}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 dark:text-white" />
            ) : (
              <Maximize2 className="w-5 h-5 dark:text-white" />
            )}
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Plus className="w-5 h-5 dark:text-white" />
          </button>
        </div>
      </div>

      {(isAdding || editingId) && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Collection Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <input
            type="text"
            placeholder="Topic"
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
                setFormData({ name: '', topic: '' });
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {editingId ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {collections.map((collection: FlashcardCollection) => (
          <div
            key={collection.id}
            className={`p-4 rounded-lg border ${
              currentCollection === collection.id
                ? 'border-blue-500 dark:border-blue-400'
                : 'border-gray-200 dark:border-gray-700'
            } hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Folder className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="font-medium dark:text-white">{collection.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {collection.topic}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewModeChange('play', collection.id);
                  }}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Play className="w-4 h-4 text-green-500" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewModeChange('edit', collection.id);
                    setEditingId(collection.id);
                    setFormData({
                      name: collection.name,
                      topic: collection.topic,
                    });
                  }}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Edit className="w-4 h-4 dark:text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCollection(collection.id);
                  }}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}