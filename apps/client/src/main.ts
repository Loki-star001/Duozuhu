import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import App from './App.vue';
import './index.css';
import './client-component-standard.css';
import './element-client-theme.css';
import './client-dialog-standard.css';
import './scene-screen-theme.css';
import './company-color-tokens.css';
import './company-client-theme.css';
import './scene-presentation-theme.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(ElementPlus, {
  locale: zhCn,
});

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.mount('#root');
