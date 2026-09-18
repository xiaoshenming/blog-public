const path = require('path');

const babelConfig = require('./babel.config');

module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    '@stylexjs/postcss-plugin': {
      // 绝对路径：Turbopack 沙箱的 cwd 不可靠，相对 glob 有扫空风险
      include: [path.join(__dirname, 'src/**/*.{js,jsx,ts,tsx}')],
      babelConfig: {
        babelrc: false,
        parserOpts: { plugins: ['typescript', 'jsx'] },
        plugins: babelConfig.plugins,
      },
      useCSSLayers: true,
    },
    autoprefixer: {},
  },
};
