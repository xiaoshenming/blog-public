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
        // 禁止加载项目根 babel.config.js：扫描只需 stylex 插件；
        // next/babel 预置不仅拖慢扫描，其内置 regexpu 在扫描 babel 环境中
        // 处理 \p{...} 正则时会崩溃（2026-09-18 实测：VisualizerSubtitleOverlay.tsx）
        configFile: false,
        parserOpts: { plugins: ['typescript', 'jsx'] },
        plugins: babelConfig.plugins,
      },
      useCSSLayers: true,
    },
    autoprefixer: {},
  },
};
