'use client';

import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import CalendarForm from '@/app/components/CalendarForm';

export default function TestPage() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Calendar Test</h1>
      <div className="w-96">
        <Calendar
          onChange={(value) => {
            console.log('Selected:', value);
            setDate(value as Date);
          }}
          value={date}
        />
      </div>
      <div className="mt-4">
        Selected: {date ? date.toLocaleDateString() : 'None'}
      </div>
      <CalendarForm />
    </div>
  );
} 