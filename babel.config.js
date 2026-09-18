const path = require('path');

const dev = process.env.NODE_ENV !== 'production';

/** StyleX 官方 Next.js 集成：Babel 编译 + PostCSS 收集（Next.js 16.0.3+ 支持 Turbopack） */
module.exports = {
  presets: ['next/babel'],
  plugins: [
    [
      '@stylexjs/babel-plugin',
      {
        dev,
        runtimeInjection: false,
        enableInlinedConditionalMerge: true,
        treeshakeCompensation: true,
        // src 目录项目：@/* → <root>/src/*（官方示例假设无 src 目录，此处已修正——demo 实测踩坑）
        aliases: { '@/*': [path.join(__dirname, 'src', '*')] },
        unstable_moduleResolution: { type: 'commonJS' },
      },
    ],
  ],
};
