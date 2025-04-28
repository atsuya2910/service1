import { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { z } from 'zod';
import { CATEGORIES } from '@/app/types/try';
import { format, isEqual } from 'date-fns';
import { ja } from 'date-fns/locale';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { styled } from '@mui/material/styles';
import { Badge } from '@mui/material';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

interface ImageFile extends File {
  preview?: string;
}

const trySchema = z.object({
  title: z.string().min(1, '必須項目です'),
  category: z.enum(CATEGORIES),
  description: z.string(),
  dates: z.array(z.string()).min(1, '少なくとも1つの開催日を選択してください'),
  location: z.string().optional(),
  capacity: z.number().min(1, '最小1人以上の定員が必要です'),
  imageUrls: z.array(z.string()),
  tags: z.array(z.string()),
  seekingCompanion: z.boolean(),
});

type TryInput = z.infer<typeof trySchema>;

const defaultValues: TryInput = {
  title: '',
  category: 'event',
  description: '',
  dates: [],
  location: '',
  capacity: 1,
  imageUrls: [],
  tags: [],
  seekingCompanion: false,
};

const StyledCalendarContainer = styled('div')({
  '& .MuiPickersLayout-root': {
    backgroundColor: 'transparent',
    border: 'none',
    boxShadow: 'none',
  },
  '& .MuiPickersCalendarHeader-root': {
    paddingLeft: '24px',
    paddingRight: '24px',
    marginTop: '8px',
  },
  '& .MuiDayCalendar-weekDayLabel': {
    width: '40px',
    height: '40px',
  },
  '& .MuiPickersDay-root': {
    width: '40px',
    height: '40px',
    fontSize: '0.875rem',
    '&.Mui-selected': {
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      '&:hover': {
        backgroundColor: '#2563eb',
      },
    },
    '&.Mui-disabled': {
      color: '#9ca3af',
    },
  },
  '& .MuiDialogActions-root': {
    display: 'none',
  },
});

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
  const [showPreview, setShowPreview] = useState(false);
  const [hasDraftState, setHasDraftState] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    control,
    reset,
    watch,
  } = useForm<TryInput>({
    resolver: zodResolver(trySchema),
    defaultValues,
  });

  useEffect(() => {
    register('dates');
  }, [register]);

  useEffect(() => {
    // カスタムスタイルを動的に追加
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      .calendar-container {
        width: 100%;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        padding: 1rem;
      }
      .react-calendar {
        width: 100%;
        border: none;
        background: white;
        font-family: inherit;
      }
      .react-calendar__tile {
        padding: 1em 0.5em;
        font-size: 0.875rem;
        color: #374151;
        position: relative;
      }
      .react-calendar__tile:enabled:hover,
      .react-calendar__tile:enabled:focus {
        background-color: #f3f4f6;
        border-radius: 0.375rem;
      }
      .react-calendar__tile--now {
        background-color: #f0f9ff;
        border-radius: 0.375rem;
      }
      .react-calendar__tile--active {
        background-color: #3b82f6 !important;
        color: white;
        border-radius: 0.375rem;
      }
      .react-calendar__tile--active:enabled:hover,
      .react-calendar__tile--active:enabled:focus {
        background-color: #2563eb !important;
      }
      .react-calendar__navigation button {
        font-size: 0.875rem;
        color: #374151;
      }
      .react-calendar__navigation button:enabled:hover,
      .react-calendar__navigation button:enabled:focus {
        background-color: #f3f4f6;
        border-radius: 0.375rem;
      }
      .react-calendar__month-view__weekdays__weekday {
        font-size: 0.75rem;
        color: #6b7280;
        text-transform: none;
        text-decoration: none;
      }
      .react-calendar__month-view__weekdays__weekday abbr {
        text-decoration: none;
      }
      .selected-date {
        background-color: #3b82f6 !important;
        color: white !important;
        border-radius: 0.375rem;
      }
      .selected-date:hover {
        background-color: #2563eb !important;
      }
      .selected-date::after {
        content: '';
        position: absolute;
        bottom: 0.25rem;
        left: 50%;
        transform: translateX(-50%);
        width: 0.375rem;
        height: 0.375rem;
        background-color: white;
        border-radius: 50%;
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const onSubmit = async (data: TryInput) => {
    if (!user) return;
    if (data.dates.length === 0) {
      setImageError('開催日を選択してください');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // 画像のアップロード処理
      const uploadedImageUrls = await Promise.all(
        images.map(async (file) => {
          const storageRef = ref(storage, `tries/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          return getDownloadURL(storageRef);
        })
      );

      const tryData = {
        ...data,
        imageUrls: uploadedImageUrls,
        userId: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: 'open' as const,
        participantCount: 0,
      };

      await addDoc(collection(db, 'tries'), tryData);
      setSubmitSuccess(true);
      router.push('/tries');
    } catch (error) {
      console.error('Error creating try:', error);
      setImageError('TRYの作成中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateSelect = (clickedDate: Date) => {
    const dateStr = format(clickedDate, 'yyyy-MM-dd');
    const dateIndex = selectedDates.indexOf(dateStr);
    
    let updatedDates: string[];
    if (dateIndex >= 0) {
      // 日付が既に選択されている場合は削除
      updatedDates = selectedDates.filter(date => date !== dateStr);
    } else {
      // 新しい日付を追加
      updatedDates = [...selectedDates, dateStr].sort();
    }
    
    setSelectedDates(updatedDates);
    setValue('dates', updatedDates);
  };

  const handleDateRemove = (dateToRemove: string) => {
    const updatedDates = selectedDates.filter(date => date !== dateToRemove);
    setSelectedDates(updatedDates);
    setValue('dates', updatedDates);
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'yyyy年MM月dd日(E)', { locale: ja });
  };

  // エラーメッセージの表示用コンポーネント
  const ErrorMessage = ({ message }: { message: string }) => (
    <p className="text-sm text-red-600 mt-1">{message}</p>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* タイトル */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          タイトル<span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('title')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      {/* カテゴリー */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          カテゴリー<span className="text-red-500">*</span>
        </label>
        <select
          {...register('category')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
        {errors.category && (
          <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
        )}
      </div>

      {/* 説明 */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          説明<span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('description')}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* 開催日 */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          開催日<span className="text-red-500">*</span>
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="calendar-container">
            <Calendar
              onClickDay={handleDateSelect}
              value={null}
              minDate={new Date()}
              locale="ja-JP"
              selectRange={false}
              tileClassName={({ date }) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                return selectedDates.includes(dateStr) ? 'selected-date' : '';
              }}
              showNeighboringMonth={false}
              next2Label={null}
              prev2Label={null}
            />
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">選択された日程</h3>
              <span className="text-sm text-gray-500">{selectedDates.length}件</span>
            </div>
            
            {selectedDates.length > 0 ? (
              <div className="space-y-2">
                {selectedDates.map((date) => (
                  <div
                    key={date}
                    className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                  >
                    <span className="text-sm text-gray-700">
                      {format(new Date(date), 'yyyy年MM月dd日(E)', { locale: ja })}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDateRemove(date)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                日程が選択されていません
              </p>
            )}
          </div>
        </div>

        {imageError && (
          <p className="text-sm text-red-600">{imageError}</p>
        )}
        {errors.dates && (
          <p className="text-sm text-red-600">{errors.dates.message}</p>
        )}
      </div>

      {/* 場所 */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          場所
        </label>
        <input
          type="text"
          {...register('location')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
        {errors.location && (
          <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
        )}
      </div>

      {/* 定員 */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          定員<span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          {...register('capacity', { valueAsNumber: true })}
          min={1}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
        {errors.capacity && (
          <p className="mt-1 text-sm text-red-600">{errors.capacity.message}</p>
        )}
      </div>

      {/* タグ */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          タグ
        </label>
        <div className="mt-1 flex flex-wrap gap-2">
          {watch('tags').map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => {
                  const newTags = watch('tags').filter((_, i) => i !== index);
                  setValue('tags', newTags);
                }}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tagInput.trim()) {
                e.preventDefault();
                const newTags = [...watch('tags'), tagInput.trim()];
                setValue('tags', newTags);
                setTagInput('');
              }
            }}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="タグを入力してEnterを押してください"
          />
        </div>
      </div>

      {/* 伴走者募集 */}
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            {...register('seekingCompanion')}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">伴走者を募集する</span>
        </label>
      </div>

      {/* 送信ボタン */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
        >
          {isSubmitting ? '送信中...' : '作成する'}
        </button>
      </div>
    </form>
  );
} 