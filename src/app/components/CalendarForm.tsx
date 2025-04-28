import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format, isSameDay } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// --- ここからコンポーネント ---
export default function CalendarForm() {
  const { register, handleSubmit, setValue } = useForm();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  // スタイル動的追加
  useEffect(() => {
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
      .selected-date {
        background-color: #3b82f6 !important;
        color: white !important;
        border-radius: 0.375rem;
      }
      .selected-date:hover {
        background-color: #2563eb !important;
      }
    `;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // 日付選択
  const handleDateSelect = (clickedDate: Date) => {
    const alreadySelected = selectedDates.some(date => isSameDay(date, clickedDate));
    let updatedDates: Date[];

    if (alreadySelected) {
      updatedDates = selectedDates.filter(date => !isSameDay(date, clickedDate));
    } else {
      updatedDates = [...selectedDates, clickedDate];
    }

    setSelectedDates(updatedDates);
    setValue('dates', updatedDates.map(date => format(date, 'yyyy-MM-dd')));
  };

  // フォーム送信
  const onSubmit = (data: any) => {
    console.log('送信データ:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              showNeighboringMonth={false}
              next2Label={null}
              prev2Label={null}
              tileClassName={({ date }) => {
                const matched = selectedDates.some(d => isSameDay(d, date));
                return matched ? 'selected-date' : '';
              }}
            />
          </div>

          {/* 選択済み日付一覧 */}
          <div>
            <h3 className="text-sm font-semibold mb-2">選択された日付:</h3>
            <ul className="list-disc list-inside text-sm text-gray-700">
              {selectedDates
                .sort((a, b) => a.getTime() - b.getTime())
                .map((date) => (
                  <li key={date.toISOString()}>{format(date, 'yyyy-MM-dd')}</li>
                ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 隠しフィールド */}
      <input type="hidden" {...register('dates')} />

      {/* 送信ボタン */}
      <div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          送信
        </button>
      </div>
    </form>
  );
} 