/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'crownpointenergy.com' },
    ],
  },
}

module.exports = nextConfig
