'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { UserFormData, Skill, SocialLinks } from '@/app/types/user';
import Image from 'next/image';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

interface ProfileEditorProps {
  userId: string;
  initialData: UserFormData;
  onClose: () => void;
}

export default function ProfileEditor({ userId, initialData, onClose }: ProfileEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData.photoURL || null);
  const [skills, setSkills] = useState<Skill[]>(initialData.skills || []);
  const [newSkill, setNewSkill] = useState<Skill>({ name: '', level: 'beginner' });
  const { register, handleSubmit, formState: { errors }, watch } = useForm<UserFormData>({
    defaultValues: {
      ...initialData,
      socialLinks: initialData.socialLinks || {}
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const timestamp = Date.now();
    const safeFileName = encodeURIComponent(`${timestamp}_${file.name}`);
    const storagePath = `profile_images/${userId}/${safeFileName}`;
    const imageRef = ref(storage, storagePath);
    
    await uploadBytes(imageRef, file);
    return await getDownloadURL(imageRef);
  };

  const handleAddSkill = () => {
    if (newSkill.name.trim() && !skills.some(s => s.name === newSkill.name.trim())) {
      setSkills([...skills, { ...newSkill, name: newSkill.name.trim() }]);
      setNewSkill({ name: '', level: 'beginner' });
    }
  };

  const handleRemoveSkill = (skillName: string) => {
    setSkills(skills.filter(s => s.name !== skillName));
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      let photoURL = initialData.photoURL;
      if (selectedImage) {
        photoURL = await uploadImage(selectedImage);
      }

      const userRef = doc(db, 'users', userId);
      const updateData = {
        displayName: data.displayName.trim(),
        bio: data.bio?.trim() || '',
        location: data.location?.trim() || '',
        website: data.website?.trim() || '',
        photoURL,
        skills,
        socialLinks: {
          twitter: data.socialLinks?.twitter?.trim() || '',
          instagram: data.socialLinks?.instagram?.trim() || '',
          github: data.socialLinks?.github?.trim() || '',
          facebook: data.socialLinks?.facebook?.trim() || '',
          linkedin: data.socialLinks?.linkedin?.trim() || ''
        },
        updatedAt: serverTimestamp()
      };

      await updateDoc(userRef, updateData);
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('プロフィールの更新に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">プロフィール編集</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* プロフィール画像 */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="プロフィール画像"
                  fill
                  className="object-cover"
                  sizes="(max-width: 128px) 100vw, 128px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              )}
            </div>
            <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              画像を変更
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageChange}
              />
            </label>
          </div>

          {/* 基本情報 */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              表示名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('displayName', { 
                required: '表示名は必須です',
                minLength: { value: 2, message: '表示名は2文字以上で入力してください' },
                maxLength: { value: 50, message: '表示名は50文字以内で入力してください' }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.displayName && (
              <p className="mt-1 text-sm text-red-600">{errors.displayName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              自己紹介
            </label>
            <textarea
              {...register('bio', {
                maxLength: { value: 500, message: '自己紹介は500文字以内で入力してください' }
              })}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="あなたについて教えてください"
            />
            {errors.bio && (
              <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
            )}
          </div>

          {/* スキル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              スキル・得意分野
            </label>
            <div className="space-y-2">
              {skills.map((skill, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{skill.name}</span>
                    <span className="text-sm text-gray-500">
                      {skill.level === 'beginner' ? '初級' :
                       skill.level === 'intermediate' ? '中級' : '上級'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill.name)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  placeholder="新しいスキルを追加"
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <select
                  value={newSkill.level}
                  onChange={(e) => setNewSkill({ ...newSkill, level: e.target.value as Skill['level'] })}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="beginner">初級</option>
                  <option value="intermediate">中級</option>
                  <option value="advanced">上級</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* SNSリンク */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">SNSリンク</h3>
            
            <div>
              <label className="block text-sm text-gray-600">Twitter</label>
              <input
                type="text"
                {...register('socialLinks.twitter')}
                placeholder="@username"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600">Instagram</label>
              <input
                type="text"
                {...register('socialLinks.instagram')}
                placeholder="username"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600">GitHub</label>
              <input
                type="text"
                {...register('socialLinks.github')}
                placeholder="username"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600">LinkedIn</label>
              <input
                type="text"
                {...register('socialLinks.linkedin')}
                placeholder="username"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              場所
            </label>
            <input
              type="text"
              {...register('location', {
                maxLength: { value: 100, message: '場所は100文字以内で入力してください' }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="例：東京都渋谷区"
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Webサイト
            </label>
            <input
              type="url"
              {...register('website', {
                pattern: {
                  value: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
                  message: '有効なURLを入力してください'
                }
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="https://example.com"
            />
            {errors.website && (
              <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isSubmitting ? '更新中...' : '更新する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 