<script setup>
import { onLaunch } from '@dcloudio/uni-app'
import { sessionReady } from './store/session'
import { checkAppUpdate } from './utils/updater'

onLaunch(() => {
  sessionReady()
  // #ifdef APP-PLUS
  checkAppUpdate()
  // #endif
})
</script>

<style>
/* 全局样式：所有页面共享 */
page {
  background-color: #f8f9f7;
  color: #252b30;
  font-size: 28rpx;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

view,
text {
  box-sizing: border-box;
}
</style>
