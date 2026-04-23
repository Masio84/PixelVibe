/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Phaser only runs in the browser
      config.externals = [...(config.externals || []), 'phaser'];
    }
    return config;
  },
};

export default nextConfig;
