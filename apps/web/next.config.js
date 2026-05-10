/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    webpack: (config) => {
      config.resolve.extensionAlias = {
        ...config.resolve.extensionAlias,
        '.js': ['.ts', '.tsx', '.js'],
      };
      return config;
    },
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '*',
        },
      ],
    },
  };
  
  module.exports = nextConfig;