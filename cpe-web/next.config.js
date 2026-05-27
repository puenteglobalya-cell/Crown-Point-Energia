/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    // Enable SVG imports as React components via SVGR
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test?.test?.('.svg')
    )
    if (fileLoaderRule) fileLoaderRule.exclude = /\.svg$/i

    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: [{ loader: '@svgr/webpack', options: { svgo: false } }],
    })
    return config
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'crownpointenergy.com' },
    ],
  },
}

module.exports = nextConfig
