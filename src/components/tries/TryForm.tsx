'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import ImageEditor from './ImageEditor';
import { trySchema, TryInput } from '@/types/try';
import { saveDraft, loadDraft, deleteDraft, hasDraft, DraftTry } from '@/utils/draft';
import { auth } from '@/lib/firebase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 3; // 最大3枚まで
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_TAGS = 5; // 最大5個のタグまで

interface ImageFile extends File {
  preview?: string;
}

export default function TryForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [images, setImages] = useState<ImageFile[]>([]);
  const [editingImage, setEditingImage] = useState<ImageFile | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [hasDraftState, setHasDraftState] = useState(false);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    control,
    reset,
    watch,
  } = useForm<TryInput>({
    resolver: zodResolver(trySchema),
    defaultValues: {
      title: '',
      description: '',
      needSupporter: false,
      tags: [],
    },
  });

  // フォームの値をリアルタイムで監視
  const formValues = watch();

  // 下書きの自動保存
  useEffect(() => {
    if (isDirty || images.length > 0) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        const draftData: DraftTry = {
          title: formValues.title || '',
          description: formValues.description || '',
          needSupporter: formValues.needSupporter || false,
          tags: formValues.tags || [],
          images: images.map(image => ({
            preview: image.preview!,
            name: image.name,
            type: image.type,
          })),
          lastModified: Date.now(),
        };
        saveDraft(draftData);
        setHasDraftState(true);
      }, 1000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formValues, images, isDirty]);

  // 下書きの読み込み
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setHasDraftState(true);
      if (confirm('下書きを復元しますか？')) {
        reset({
          title: draft.title,
          description: draft.description,
          needSupporter: draft.needSupporter,
          tags: draft.tags,
        });
        setTags(draft.tags);

        // 画像の復元
        try {
          const restoredImages = draft.images
            .map(img => {
              try {
                // Base64データの形式を確認
                const parts = img.preview.split(',');
                if (parts.length !== 2) {
                  console.error('Invalid Base64 format');
                  return null;
                }

                // Base64データとMIMEタイプを抽出
                const base64Data = parts[1];
                const mimeMatch = parts[0].match(/^data:(.*?);base64$/);
                if (!mimeMatch) {
                  console.error('Invalid MIME type format');
                  return null;
                }
                const mimeString = mimeMatch[1];

                // Base64デコード
                try {
                  const byteString = atob(base64Data);
                  const ab = new ArrayBuffer(byteString.length);
                  const ia = new Uint8Array(ab);
                  for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                  }
                  const blob = new Blob([ab], { type: mimeString });
                  
                  // BlobからFileオブジェクトを作成
                  const file = new File([blob], img.name, { type: img.type }) as ImageFile;
                  file.preview = img.preview;
                  return file;
                } catch (error) {
                  console.error('Base64 decode error:', error);
                  return null;
                }
              } catch (error) {
                console.error('Image restoration error:', error);
                return null;
              }
            })
            .filter((file): file is ImageFile => file !== null);

          if (restoredImages.length > 0) {
            setImages(restoredImages);
          } else {
            console.warn('No images could be restored');
          }
        } catch (error) {
          console.error('Failed to restore images:', error);
          // 画像の復元に失敗しても、他のフォームデータは保持する
        }
      } else {
        deleteDraft();
        setHasDraftState(false);
      }
    }
  }, [reset]);

  // 画像のドロップゾーン設定
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxSize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES,
    onDrop: async (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const errorMessages = rejectedFiles.map(file => {
          if (file.file.size > MAX_FILE_SIZE) {
            return 'ファイルサイズは5MB以下にしてください';
          }
          if (!ACCEPTED_IMAGE_TYPES.includes(file.file.type)) {
            return 'JPG、PNG、WebP形式のみ対応しています';
          }
          return 'ファイルのアップロードに失敗しました';
        });
        setImageError(errorMessages.join('\n'));
        return;
      }

      if (images.length + acceptedFiles.length > MAX_FILES) {
        setImageError('画像は最大3枚までアップロードできます');
        return;
      }

      // 画像の圧縮
      const compressedFiles = await Promise.all(
        acceptedFiles.map(async (file) => {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: file.type,
          };
          const compressedFile = await imageCompression(file, options);
          Object.assign(compressedFile, {
            preview: URL.createObjectURL(compressedFile),
          });
          return compressedFile as ImageFile;
        })
      );

      setImages((prev) => [...prev, ...compressedFiles]);
      setImageError(null);
    },
  });

  // 画像の削除
  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview!);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  // 画像の編集完了
  const handleEditComplete = (editedImage: File) => {
    const index = images.findIndex((img) => img === editingImage);
    if (index !== -1) {
      const newImages = [...images];
      Object.assign(editedImage, {
        preview: URL.createObjectURL(editedImage),
      });
      newImages[index] = editedImage as ImageFile;
      setImages(newImages);
    }
    setEditingImage(null);
  };

  // 画像のアップロード
  const uploadImage = async (file: File) => {
    try {
      if (!user || !user.uid) {
        throw new Error('ユーザー情報が見つかりません。再度ログインしてください。');
      }

      // Firebase Authの現在のユーザーを再確認
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('認証セッションが切れています。再度ログインしてください。');
      }

      // ユーザーIDの一貫性チェック
      if (user.uid !== currentUser.uid) {
        throw new Error('ユーザー認証に問題が発生しました。再度ログインしてください。');
      }

      // 最新のIDトークンを取得して強制的に更新
      const idToken = await currentUser.getIdToken(true);
      
      // ファイル名の生成（日本語ファイル名対応）
      const timestamp = Date.now();
      const safeFileName = encodeURIComponent(`${timestamp}_${file.name}`);
      const storagePath = `tries/${currentUser.uid}/${safeFileName}`;
      
      // storageのバケット名を明示的に指定
      const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'tryfield-dev.firebasestorage.app';
      const imageRef = ref(storage, `gs://${bucket}/${storagePath}`);
      
      console.log('アップロード開始:', {
        fileName: safeFileName,
        contentType: file.type,
        size: file.size,
        path: storagePath,
        userId: currentUser.uid,
        bucket: bucket
      });

      // メタデータを設定
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedBy: currentUser.uid,
          originalName: file.name,
          timestamp: timestamp.toString()
        }
      };

      // アップロードの進捗を監視するPromiseを作成
      return new Promise<string>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(imageRef, file, metadata);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`アップロード進捗 (${file.name}): ${progress}%`);
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: progress
            }));
          },
          (error: any) => {
            console.error('アップロードエラー:', error);
            console.error('エラーコード:', error.code);
            console.error('エラーメッセージ:', error.message);
            
            let errorMessage = 'アップロードに失敗しました。';
            if (error.code === 'storage/unauthorized') {
              errorMessage = 'ストレージへのアクセスが拒否されました。再度ログインしてください。';
            } else if (error.code === 'storage/canceled') {
              errorMessage = 'アップロードがキャンセルされました。';
            } else if (error.code === 'storage/unknown') {
              errorMessage = `予期せぬエラーが発生しました: ${error.message}`;
            }
            reject(new Error(errorMessage));
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(imageRef);
              console.log('ダウンロードURL取得完了:', downloadURL);
              resolve(downloadURL);
            } catch (error) {
              console.error('ダウンロードURL取得エラー:', error);
              reject(new Error('画像URLの取得に失敗しました。'));
            }
          }
        );
      });
    } catch (error) {
      console.error('アップロード処理エラー:', error);
      throw error;
    }
  };

  // タグの追加
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && tags.length < MAX_TAGS && !tags.includes(newTag)) {
        const newTags = [...tags, newTag];
        setTags(newTags);
        setValue('tags', newTags);
        setTagInput('');
      }
    }
  };

  // タグの削除
  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    setValue('tags', newTags);
  };

  const onSubmit = async (data: TryInput) => {
    try {
      if (!user || !user.uid) {
        throw new Error('ユーザー情報が見つかりません。再度ログインしてください。');
      }

      // Firebase Authの現在のユーザーを再確認
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('認証セッションが切れています。再度ログインしてください。');
      }

      // ユーザーIDの一貫性チェック
      if (user.uid !== currentUser.uid) {
        throw new Error('ユーザー認証に問題が発生しました。再度ログインしてください。');
      }

      console.log('投稿開始:', data);
      setIsSubmitting(true);
      setSubmitSuccess(false);

      // 画像のアップロード（エラーハンドリング付き）
      console.log('画像アップロード開始');
      const imageUrls = await Promise.all(
        images.map(async (image) => {
          try {
            console.log(`画像アップロード中: ${image.name}`);
            return await uploadImage(image);
          } catch (error) {
            console.error(`画像アップロードエラー (${image.name}):`, error);
            throw error; // エラーを上位に伝播
          }
        })
      );
      console.log('画像アップロード完了:', imageUrls);

      const tryData = {
        ...data,
        userId: user?.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        imageUrls: imageUrls,
        tags: tags,
        status: 'open',
        participants: [],
      };
      console.log('Firestoreに保存するデータ:', tryData);

      const docRef = await addDoc(collection(db, 'tries'), tryData);
      console.log('Firestore保存完了:', docRef.id);
      
      deleteDraft();
      setSubmitSuccess(true);

      // 成功メッセージを表示した後、みんなのTRYページに遷移
      setTimeout(() => {
        router.push('/tries');
      }, 1500);
    } catch (error: any) {
      console.error('Error adding try:', error);
      setSubmitSuccess(false);
      alert(error.message || '投稿に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {submitSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
          <p className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            TRYを投稿しました！
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          {hasDraftState && (
            <span className="text-sm text-gray-500">
              下書きを自動保存しています
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {hasDraftState && (
            <button
              type="button"
              onClick={() => {
                if (confirm('下書きを削除してもよろしいですか？')) {
                  deleteDraft();
                  setHasDraftState(false);
                  reset({
                    title: '',
                    description: '',
                    needSupporter: false,
                    tags: [],
                  });
                  setTags([]);
                  setImages([]);
                }
              }}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-red-700 bg-white border border-red-300 hover:bg-red-50"
            >
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              下書きを削除
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
          >
            {showPreview ? (
              <>
                <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                編集に戻る
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                プレビュー
              </>
            )}
          </button>
        </div>
      </div>

      {showPreview ? (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              {images.length > 0 && (
                <div className="relative w-full h-64">
                  <Image
                    src={images[0].preview!}
                    alt="プレビュー画像"
                    fill
                    className="object-cover"
                  />
                  {images.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {images.map((_, index) => (
                        <div
                          key={index}
                          className="h-1.5 w-1.5 rounded-full bg-white"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {formValues.title || 'タイトルを入力してください'}
                  </h3>
                  {formValues.needSupporter && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                      伴走者募集中
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm mb-4 whitespace-pre-wrap">
                  {formValues.description || '説明を入力してください'}
                </p>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <span>たった今</span>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                    進行中
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700"
            >
              タイトル
            </label>
            <input
              type="text"
              id="title"
              {...register('title')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="例：毎日30分運動する"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              詳細
            </label>
            <textarea
              id="description"
              rows={4}
              {...register('description')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="目標の詳細や達成したい理由を書いてみましょう"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              画像（最大3枚まで）
            </label>
            <div
              {...getRootProps()}
              className="mt-1 flex justify-center rounded-lg border border-dashed border-gray-300 px-6 py-10 cursor-pointer hover:border-gray-400"
            >
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <div className="mt-4 flex text-sm text-gray-600">
                  <input {...getInputProps()} />
                  <p>ドラッグ&ドロップまたはクリックして画像をアップロード</p>
                </div>
              </div>
            </div>
            {imageError && (
              <p className="mt-1 text-sm text-red-600">{imageError}</p>
            )}
            <div className="mt-4 grid grid-cols-3 gap-4">
              {images.map((file, index) => (
                <div key={file.name} className="relative">
                  <div className="relative h-32 w-full overflow-hidden rounded-lg">
                    <Image
                      src={file.preview!}
                      alt={file.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="absolute top-0 right-0 flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingImage(file)}
                      className="rounded-full bg-white p-1 text-gray-900 shadow-sm hover:bg-gray-50"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="rounded-full bg-white p-1 text-gray-900 shadow-sm hover:bg-gray-50"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {uploadProgress[file.name] !== undefined && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                      {Math.round(uploadProgress[file.name])}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="tags"
              className="block text-sm font-medium text-gray-700"
            >
              タグ（最大5個）
            </label>
            <div className="mt-1">
              <div className="flex flex-wrap gap-2 p-2 border rounded-md border-gray-300">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder={tags.length >= MAX_TAGS ? "タグの上限に達しました" : "タグを入力（Enterで追加）"}
                  className="flex-1 min-w-[120px] outline-none"
                  disabled={tags.length >= MAX_TAGS}
                />
              </div>
              {errors.tags && (
                <p className="mt-1 text-sm text-red-600">{errors.tags.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="needSupporter"
              {...register('needSupporter')}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="needSupporter"
              className="ml-2 block text-sm text-gray-700"
            >
              伴走者を募集する
            </label>
          </div>
        </form>
      )}

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400"
        >
          {isSubmitting ? '投稿中...' : '投稿する'}
        </button>
      </div>

      {editingImage && (
        <ImageEditor
          image={editingImage}
          onSave={handleEditComplete}
          onCancel={() => setEditingImage(null)}
        />
      )}
    </div>
  );
} 