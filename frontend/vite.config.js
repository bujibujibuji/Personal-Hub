import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// es2015 降级后 esbuild 会引入 __spreadProps 辅助函数，它在文件开头就读取
// Object.getOwnPropertyDescriptors（Chrome 54+）。若只在 polyfill.js 里补齐，
// 辅助函数早已捕获到 undefined，Chrome 49~53 运行时会直接报错。
// 因此把这一小段 ES5 兼容代码放在构建产物最前面，确保先于所有辅助函数执行；
// 同时挂一个早期错误监听：模块初始化阶段出错时用原生弹窗显示信息，方便定位白屏。
const ES5_PRELUDE = `(function(){if(typeof Object.getOwnPropertyDescriptors!=='function'){Object.getOwnPropertyDescriptors=function(o){var r={};if(o==null)return r;Object.getOwnPropertyNames(o).forEach(function(k){r[k]=Object.getOwnPropertyDescriptor(o,k)});if(typeof Object.getOwnPropertySymbols==='function'){Object.getOwnPropertySymbols(o).forEach(function(k){r[k]=Object.getOwnPropertyDescriptor(o,k)})}return r}}})();(function(){try{var g=typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null;if(!g||!g.addEventListener||g.__phErrorHook)return;g.__phErrorHook=!0;var start=Date.now(),reported=!1;g.addEventListener('error',function(e){if(reported||Date.now()-start>20000)return;reported=!0;var m=e&&(e.message||(e.error&&e.error.message))||'未知脚本错误';try{if(typeof plus!=='undefined'&&plus.nativeUI&&plus.nativeUI.alert)plus.nativeUI.alert('启动异常：'+m)}catch(x){}},!0)}catch(x){}})();`

// 把上面的预置代码插到最终 chunk 最前面（在 esbuild 生成的辅助函数之前）。
function legacyPreludePlugin() {
  return {
    name: 'personal-hub:legacy-prelude',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk' && item.code && !item.code.startsWith(ES5_PRELUDE)) {
          item.code = ES5_PRELUDE + item.code
        }
      }
    },
  }
}

// H5 开发时把 /api 转发到本机 Spring Boot 后端。
// App 端直连 src/config.js 中配置的服务器地址，不经过此代理。
export default defineConfig({
  plugins: [uni(), legacyPreludePlugin()],
  build: {
    // App 端 app-service.js 由手机系统 WebView 直接执行，语法必须足够旧：
    // 老机型可能停留在 Chrome 49~60（不支持 async/对象展开）、Chrome < 64
    // （不支持命名捕获组、\p{...}、matchAll），任何一个语法错误都会让整个
    // app-service.js 无法解析，表现为“闪屏 10 秒 + 除底部导航外整页空白”。
    // 因此语法统一降级到 es2015，缺失的内置方法由 src/utils/polyfill.js 补齐。
    // 改动依赖后请运行 npm run check:app-syntax 复核产物。
    target: 'es2015',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
