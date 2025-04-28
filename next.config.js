/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  reactStrictMode: true,
  // async headers() {
  //   return [
  //     {
  //       source: '/:path*',
  //       headers: [
  //         {
  //           key: 'Access-Control-Allow-Origin',
  //           value: process.env.NODE_ENV === 'development' ? 'http://localhost:3003' : process.env.NEXT_PUBLIC_SITE_URL || '*'
  //         },
  //         {
  //           key: 'Access-Control-Allow-Methods',
  //           value: 'GET,POST,PUT,DELETE,OPTIONS,HEAD'
  //         },
  //         {
  //           key: 'Access-Control-Allow-Headers',
  //           value: '*'
  //         },
  //         {
  //           key: 'Access-Control-Expose-Headers',
  //           value: '*'
  //         },
  //         {
  //           key: 'Access-Control-Allow-Credentials',
  //           value: 'true'
  //         },
  //         {
  //           key: 'Vary',
  //           value: 'Origin'
  //         }
  //       ]
  //     }
  //   ]
  // },
};

module.exports = nextConfig; 