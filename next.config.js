/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('pdf-parse');
      config.externals.push('pdf-parse/lib/pdf-parse');
    }
    return config;
  }
};

module.exports = nextConfig;
