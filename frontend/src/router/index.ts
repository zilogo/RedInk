import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import OutlineView from '../views/OutlineView.vue'
import GenerateView from '../views/GenerateView.vue'
import ResultView from '../views/ResultView.vue'
import HistoryView from '../views/HistoryView.vue'
import SettingsView from '../views/SettingsView.vue'

// PPT 功能页面
import PptHomeView from '../views/ppt/PptHomeView.vue'
import PptOutlineView from '../views/ppt/PptOutlineView.vue'
import PptGenerateView from '../views/ppt/PptGenerateView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/outline',
      name: 'outline',
      component: OutlineView
    },
    {
      path: '/generate',
      name: 'generate',
      component: GenerateView
    },
    {
      path: '/result',
      name: 'result',
      component: ResultView
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryView
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView
    },
    // PPT 生成路由
    {
      path: '/ppt',
      name: 'ppt',
      component: PptHomeView
    },
    {
      path: '/ppt/outline',
      name: 'ppt-outline',
      component: PptOutlineView
    },
    {
      path: '/ppt/generate',
      name: 'ppt-generate',
      component: PptGenerateView
    }
  ]
})

export default router
