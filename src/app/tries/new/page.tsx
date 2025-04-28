'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { CATEGORIES } from '@/app/types/try';
import { trySchema, Try } from '@/app/types/try';
import { z } from 'zod';
import Image from 'next/image';

export default function NewTryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    category: 'event' as Try['category'],
    description: '',
    date: '',
    location: '',
    capacity: '',
    tags: [] as string[],
    seekingCompanion: false,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    // ローディング中は何もしない
    if (loading) return;
    
    // 未ログインの場合のみログインページにリダイレクト
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, loading, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + previewUrls.length > 5) {
      alert('画像は最大5枚までアップロードできます');
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    // プレビューURLの生成
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newPreviewUrls]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);
    setImages(newImages);
    setPreviewUrls(newPreviewUrls);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('フォーム送信開始:', formData); // デバッグログ

    if (!user) {
      console.error('ユーザーが認証されていません');
      router.push('/login');
      return;
    }

    setErrors({});

    try {
      console.log('バリデーション開始'); // デバッグログ
      // バリデーション
      const validatedData = trySchema.parse({
        ...formData,
        dates: formData.date ? [formData.date] : [],
        imageUrls: [], // 空配列で渡す
        capacity: formData.capacity ? Number(formData.capacity) : undefined,
        userId: user.uid,
      });
      console.log('バリデーション成功:', validatedData); // デバッグログ

      // 画像のアップロード
      console.log('画像アップロード開始:', images.length, '枚'); // デバッグログ
      const imageUrls = await Promise.all(
        images.map(async (image) => {
          const storageRef = ref(storage, `tries/${Date.now()}_${image.name}`);
          await uploadBytes(storageRef, image);
          const url = await getDownloadURL(storageRef);
          console.log('画像アップロード成功:', url); // デバッグログ
          return url;
        })
      );

      // Firestoreにデータを保存
      console.log('Firestore保存開始'); // デバッグログ
      const tryData = {
        ...validatedData,
        imageUrls,
        userId: user.uid,
        status: 'open' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'tries'), tryData);
      console.log('Firestore保存成功:', docRef.id); // デバッグログ
      
      // 成功メッセージを表示
      alert('TRYが作成されました！');
      
      // みんなのTRYページに遷移
      router.push('/tries');
    } catch (error) {
      console.error('エラー発生:', error); // デバッグログ
      if (error instanceof z.ZodError) {
        const newErrors: { [key: string]: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
        console.log('バリデーションエラー:', newErrors); // デバッグログ
      } else {
        console.error('Error creating try:', error);
        setErrors({ submit: '投稿に失敗しました。もう一度お試しください。' });
      }
    }
  };

  // ローディング中の表示
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 未ログインの場合は何も表示しない（リダイレクト中）
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-purple-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            新しい
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              TRY
            </span>
            を作成
          </h1>
          <p className="text-gray-600 mb-8">
            あなたの挑戦を共有して、仲間と一緒に成長しましょう
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* タイトル */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                タイトル<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例：プログラミングスキルを向上させる"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            {/* カテゴリー選択 */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                カテゴリー<span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Try['category'] })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            {/* 説明 */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                説明
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="TRYの詳細を記入してください"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            {/* 日付 */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                開催日<span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date}</p>
              )}
            </div>

            {/* 場所 */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                場所
              </label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例：オンライン、東京都渋谷区"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">{errors.location}</p>
              )}
            </div>

            {/* 定員 */}
            <div>
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                定員
              </label>
              <input
                type="number"
                id="capacity"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例：5"
                min="0"
              />
              {errors.capacity && (
                <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>
              )}
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

              {/* 画像プレビュー */}
              {previewUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
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
                        onClick={() => removeImage(index)}
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
                      onClick={() => {
                        const newTags = [...formData.tags];
                        newTags.splice(index, 1);
                        setFormData({ ...formData, tags: newTags });
                      }}
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
                        setFormData({
                          ...formData,
                          tags: [...formData.tags, tagInput.trim()]
                        });
                        setTagInput('');
                      }
                    }
                  }}
                  placeholder="タグを入力してEnterを押してください"
                  className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (tagInput.trim() && formData.tags.length < 5 && !formData.tags.includes(tagInput.trim())) {
                      setFormData({
                        ...formData,
                        tags: [...formData.tags, tagInput.trim()]
                      });
                      setTagInput('');
                    }
                  }}
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

            {/* 送信ボタン */}
            <div className="flex justify-end">
              <button
                type="submit"
                className={`
                  px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full
                  font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2
                  focus:ring-offset-2 focus:ring-blue-500 transition-colors
                `}
              >
                TRYを作成
              </button>
            </div>

            {/* 全体のエラーメッセージ */}
            {errors.submit && (
              <div className="mt-4 text-center text-red-600">{errors.submit}</div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
} 