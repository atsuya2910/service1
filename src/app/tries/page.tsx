'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Try } from '../types/try';
import type { TrySearchFilter } from '../types/try';
import TryCard from '@/app/components/TryCard';
import SearchFilter from '../components/TrySearchFilter';

export default function TriesPage() {
  const [tries, setTries] = useState<Try[]>([]);
  const [filteredTries, setFilteredTries] = useState<Try[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTries = async () => {
      try {
        const triesRef = collection(db, 'tries');
        const q = query(triesRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const triesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Try[];
        setTries(triesData);
        setFilteredTries(triesData);
      } catch (error) {
        console.error('Error fetching tries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTries();
  }, []);

  const handleFilterChange = (filter: TrySearchFilter) => {
    let filtered = [...tries];

    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase();
      filtered = filtered.filter(try_ =>
        try_.title.toLowerCase().includes(keyword) ||
        try_.description?.toLowerCase().includes(keyword)
      );
    }

    if (filter.category) {
      filtered = filtered.filter(try_ => try_.category === filter.category);
    }

    if (filter.location) {
      filtered = filtered.filter(try_ => try_.location === filter.location);
    }

    if (filter.startDate) {
      filtered = filtered.filter(try_ => try_.dates[0] >= filter.startDate!);
    }

    if (filter.endDate) {
      filtered = filtered.filter(try_ => try_.dates[0] <= filter.endDate!);
    }

    setFilteredTries(filtered);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">みんなのTRY</h1>
      
      {/* 検索フィルター */}
      <div className="mb-8">
        <SearchFilter onFilterChange={handleFilterChange} />
      </div>

      {/* TRY一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTries.map((try_) => (
          <TryCard
            key={try_.id}
            try_={try_}
          />
        ))}
      </div>

      {filteredTries.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">該当するTRYが見つかりませんでした。</p>
        </div>
      )}
    </div>
  );
} 