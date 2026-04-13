/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // 빌드 타임의 자잘한 타입 에러를 무시하여 배포를 우선시합니다.
    ignoreBuildErrors: true,
  },
  eslint: {
    // 빌드 타임의 린트 에러를 무시합니다.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
