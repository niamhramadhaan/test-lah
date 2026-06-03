/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.vecteezy.com",
      },
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
      },
      {
        protocol: "https",
        hostname: "cdn2.thecatapi.com",
      },
      {
        protocol: "https",
        hostname: "cdn2.thecatapi.com",
      },
      {
        protocol: "https",
        hostname: "lottie.host",
      },
    ],
  },
};

export default nextConfig;
