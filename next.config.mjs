/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "napkinsdev.s3.us-east-1.amazonaws.com",
        pathname: "/next-s3-uploads/**",
      },
      {
        protocol: "https",
        hostname: "togetherai-ix.s3.us-east-1.amazonaws.com",
        pathname: "/next-s3-uploads/**",
      },
    ],
  },
};

export default nextConfig;
