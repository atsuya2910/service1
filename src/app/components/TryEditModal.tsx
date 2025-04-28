'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Try, CATEGORIES } from '@/app/types/try';
import { format } from 'date-fns';
import Image from 'next/image';

interface TryEditModalProps {
  try_: Try;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedTry: Try) => void;
}

export default function TryEditModal({ try_, isOpen, onClose, onUpdate }: TryEditModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    category: 'event' as Try['category'],
    description: '',
    dates: [] as string[],
    location: '',
    capacity: 0,
    tags: [] as string[],
    seekingCompanion: false,
  });
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (try_) {
      setFormData({
        title: try_.title,
        category: try_.category,
        description: try_.description || '',
        dates: try_.dates || [],
        location: try_.location || '',
        capacity: try_.capacity,
        tags: try_.tags || [],
        seekingCompanion: try_.seekingCompanion || false,
      });
      setExistingImages(try_.imageUrls || []);
    }
  }, [try_]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + previewUrls.length + existingImages.length > 5) {
      alert('画像は最大5枚までアップロードできます');
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    // プレビューURLの生成
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newPreviewUrls]);
  };

  const removeNewImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);
    setImages(newImages);
    setPreviewUrls(newPreviewUrls);
  };

  const removeExistingImage = async (url: string) => {
    try {
      // Storageから画像を削除
      const imageRef = ref(storage, url);
      await deleteObject(imageRef);
      
      // 状態を更新
      setExistingImages(existingImages.filter(img => img !== url));
    } catch (error) {
      console.error('Error removing image:', error);
      alert('画像の削除に失敗しました');
    }
  };

  const handleTagAdd = () => {
    if (tagInput.trim() && formData.tags.length < 5 && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleTagRemove = (index: number) => {
    const newTags = [...formData.tags];
    newTags.splice(index, 1);
    setFormData({ ...formData, tags: newTags });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tryRef = doc(db, 'tries', try_.id!);

      // 新しい画像をアップロード
      const newImageUrls = await Promise.all(
        images.map(async (image) => {
          const storageRef = ref(storage, `tries/${Date.now()}_${image.name}`);
          await uploadBytes(storageRef, image);
          return getDownloadURL(storageRef);
        })
      );

      // 既存の画像と新しい画像を結合
      const allImageUrls = [...existingImages, ...newImageUrls];

      const updateData = {
        ...formData,
        imageUrls: allImageUrls,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(tryRef, updateData);
      onUpdate({ ...try_, ...updateData, updatedAt: try_.updatedAt });
      onClose();
    } catch (error) {
      console.error('Error updating try:', error);
      alert('TRYの更新中にエラーが発生しました。');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">TRYを編集</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">タイトル</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">カテゴリー</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as Try['category'] })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category === 'event' ? 'イベント'
                    : category === 'project' ? 'プロジェクト'
                    : category === 'recruitment' ? '募集'
                    : category === 'sports' ? 'スポーツ'
                    : 'その他'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">説明</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">日時</label>
            <input
              type="date"
              value={formData.dates[0]}
              onChange={(e) => setFormData({ ...formData, dates: [e.target.value] })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">場所</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">定員</label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              min="1"
              required
            />
          </div>

          {/* 画像アップロード */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              画像（最大5枚）
            </label>
            <div className="mt-2 flex items-center space-x-4">
              <label className="relative cursor-pointer bg-white rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-blue-500 transition-colors">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="text-sm text-gray-600">
                    クリックして画像を選択
                  </div>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                />
              </label>
            </div>

            {/* 既存の画像プレビュー */}
            {existingImages.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">既存の画像</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {existingImages.map((url, index) => (
                    <div key={index} className="relative">
                      <Image
                        src={url}
                        alt={`Existing ${index + 1}`}
                        width={200}
                        height={200}
                        className="rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(url)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 新しい画像プレビュー */}
            {previewUrls.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">新しい画像</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative">
                      <Image
                        src={url}
                        alt={`Preview ${index + 1}`}
                        width={200}
                        height={200}
                        className="rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* タグ入力 */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              タグ（最大5個）
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleTagRemove(index)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput.trim() && formData.tags.length < 5) {
                    e.preventDefault();
                    if (!formData.tags.includes(tagInput.trim())) {
                      handleTagAdd();
                    }
                  }
                }}
                placeholder="タグを入力してEnterを押してください"
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleTagAdd}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                追加
              </button>
            </div>
          </div>

          {/* 伴走者募集 */}
          <div className="mb-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.seekingCompanion}
                onChange={(e) => setFormData({ ...formData, seekingCompanion: e.target.checked })}
                className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">伴走者を募集する</span>
            </label>
            {formData.seekingCompanion && (
              <p className="mt-2 text-sm text-gray-600">
                ※伴走者とは、あなたのTRYに対してアドバイスやサポートを提供してくれる人です
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              更新する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 