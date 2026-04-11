/** @type {import('next').NextConfig} */
const nextConfig = {
  // Native addon: must not be bundled into .next/server (runtime loads from node_modules)
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('sharp');
    }
    return config;
  },
};

module.exports = nextConfig;