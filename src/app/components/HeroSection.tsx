'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function HeroSection() {
  return (
    <div className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* 装飾的な背景要素 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-100 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute top-20 -left-20 w-60 h-60 bg-blue-100 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-white/50 to-transparent"></div>
      </div>

      {/* メインコンテンツ */}
      <div className="container mx-auto px-6 relative">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* 左側：テキストコンテンツ */}
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                TRYFIELD
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
              あなたの挑戦を共有し、仲間と一緒に成長しよう。
              <br className="hidden md:block" />
              新しい可能性が、ここから始まります。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/tries"
                className="inline-block bg-gradient-to-r from-red-700 to-red-900 text-white rounded-full shadow-lg px-8 py-4 text-lg font-semibold transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                みんなのTRYを見る
              </Link>
              <Link
                href="/tries/new"
                className="inline-block border-2 border-gray-800 text-gray-800 rounded-full px-8 py-4 text-lg font-semibold transform transition-all duration-300 hover:bg-gray-800 hover:text-white"
              >
                TRYを投稿する
              </Link>
            </div>
          </div>

          {/* 右側：イラスト */}
          <div className="flex-1 relative w-full max-w-lg">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            <div className="relative">
              <Image
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1471&q=80"
                alt="Team collaboration"
                width={600}
                height={400}
                className="rounded-lg shadow-2xl relative z-10"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 