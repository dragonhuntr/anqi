import React, { useState } from 'react';
import { Folder, Trash2, Plus, Play, Edit } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ConfirmDialog } from './ConfirmDialog';
import { FlashcardCollection, CollectionManagerProps, CollectionFormData, ViewMode } from '../types';

export function CollectionManager({ onViewModeChange }: CollectionManagerProps) {
    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<CollectionFormData>({
        name: '',
        topic: '',
    });
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

    const handleCollectionClick = (collection: FlashcardCollection) => {
        // if already selected, deselect
        if (currentCollection === collection.id) {
            setCurrentCollection(null);
        } else {
            setCurrentCollection(collection.id);
            onViewModeChange('edit');
        }
    };

    const handleEditClick = (e: React.MouseEvent, collection: FlashcardCollection) => {
        e.stopPropagation();
        // toggle edit mode for name and topic
        if (editingId === collection.id) {
            setEditingId(null);
            setFormData({ name: '', topic: '' });
        } else {
            setEditingId(collection.id);
            setFormData({
                name: collection.name,
                topic: collection.topic,
            });
        }
    };

    return (
        <div className="space-y-4">
            <ConfirmDialog
                isOpen={!!deleteConfirmId}
                onConfirm={() => {
                    if (deleteConfirmId) {
                        deleteCollection(deleteConfirmId);
                        setDeleteConfirmId(null);
                    }
                }}
                onCancel={() => setDeleteConfirmId(null)}
                message="are you sure you want to delete this collection? this action cannot be undone."
            />

            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold dark:text-white">Collections</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAdding(true)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <Plus className="w-5 h-5 dark:text-white" />
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                {collections.map((collection: FlashcardCollection, index) => (
                    <div
                        key={collection.id}
                        className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow relative group 
                            ${editingId === collection.id 
                                ? 'border-2 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                                : 'border border-gray-200 dark:border-gray-700'}
                            ${currentCollection === collection.id
                                ? 'ring-2 ring-blue-300 dark:ring-blue-600'
                                : ''}`}
                    >
                        <div
                            className="flex items-center cursor-pointer"
                            onClick={() => handleCollectionClick(collection)}
                        >
                            {editingId === collection.id ? (
                                <div className="space-y-2 w-full">
                                    <textarea
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Collection Name"
                                    />
                                    <textarea
                                        value={formData.topic}
                                        onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Topic"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSubmit}
                                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingId(null);
                                                setFormData({ name: '', topic: '' });
                                            }}
                                            className="px-3 py-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center w-full">
                                    <div className="flex items-center space-x-3">
                                        <Folder className="w-5 h-5 text-blue-500" />
                                        <div>
                                            <p className="font-medium dark:text-white">
                                                <span className="text-gray-500 mr-2">#{index + 1}</span>
                                                {collection.name}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {collection.topic}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={(e) => handleEditClick(e, collection)}
                                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                        >
                                            <Edit className="w-4 h-4 dark:text-white" />
                                        </button>

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
                                                setDeleteConfirmId(collection.id);
                                            }}
                                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {isAdding && !editingId && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-2">
                    <textarea
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Collection Name"
                    />
                    <textarea
                        value={formData.topic}
                        onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Topic"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleSubmit}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => {
                                setIsAdding(false);
                                setFormData({ name: '', topic: '' });
                            }}
                            className="px-3 py-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}