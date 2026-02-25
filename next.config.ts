import withPWA from 'next-pwa';

const nextConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  turbopack: {}, // <-- this silences the Turbopack error
});

export default nextConfig;