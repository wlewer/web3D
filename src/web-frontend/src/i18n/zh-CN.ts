// 中文语言包
export const zhCN = {
  // 应用
  app: {
    name: 'SmartAI 3D',
    tagline: '智能3D建模平台',
  },

  // 导航
  nav: {
    home: '首页',
    gallery: '画廊',
    upload: '上传',
    profile: '个人中心',
    login: '登录',
    register: '注册',
    logout: '退出',
    language: '语言',
  },

  // 首页
  home: {
    title: '3D Gaussian Splatting',
    subtitle: '革命性的3D渲染技术，亿级点云流畅加载',
    feature1Title: '3D Gaussian Splatting',
    feature1Desc: '革命性的3D渲染技术，亿级点云流畅加载',
    feature2Title: '手机拍照建模',
    feature2Desc: '上传手机照片，AI智能生成高精度3D模型',
    feature3Title: 'Web端即时预览',
    feature3Desc: '无需安装插件，浏览器直接查看3D作品',
    getStarted: '立即开始',
    learnMore: '了解更多',
  },

  // 画廊
  gallery: {
    title: '3D 模型画廊',
    subtitle: '探索精彩的 3D Gaussian Splatting 作品',
    search: '搜索作品、标签...',
    categoryAll: '全部',
    categoryBox: '精品盒',
    categoryModel: '模型',
    categoryScene: '场景',
    categoryAnimation: '动画',
    sortRecent: '最新',
    sortPopular: '最热',
    sortLikes: '最多点赞',
    itemCount: '共 {{count}} 个作品',
    preview: '预览 3D',
    by: 'by',
    emptyTitle: '没有找到匹配的作品',
    emptyButton: '清除筛选',
    close: '关闭',
    views: '浏览',
    likes: '点赞',
    author: '作者',
    hotBadge: '热门',
    newBadge: 'NEW',
    featuredWorks: '精选作品',
    allWorks: '全部作品',
    loadMore: '加载更多',
    boxCategories: '盒子分类',
    material: '材质',
    industry: '行业',
    priceRange: '价格区间',
  },

  // 用户认证
  auth: {
    login: '登录',
    register: '注册',
    email: '邮箱',
    password: '密码',
    confirmPassword: '确认密码',
    username: '用户名',
    forgotPassword: '忘记密码？',
    noAccount: '还没有账号？',
    hasAccount: '已有账号？',
    loginButton: '登录',
    registerButton: '注册',
    loginSuccess: '登录成功',
    registerSuccess: '注册成功',
    loginFailed: '登录失败',
    registerFailed: '注册失败',
    invalidEmail: '请输入有效的邮箱',
    passwordMismatch: '两次输入的密码不一致',
    passwordTooShort: '密码至少6位',
  },

  // 上传
  upload: {
    title: '上传模型',
    dragDrop: '拖拽图片到此处',
    or: '或',
    selectFile: '选择文件',
    supported: '支持 JPG、PNG 格式',
    preview: '预览',
    submit: '提交建模',
    processing: '处理中...',
    success: '上传成功',
    failed: '上传失败',
  },

  // 个人中心
  profile: {
    title: '个人中心',
    myModels: '我的模型',
    settings: '设置',
    editProfile: '编辑资料',
    changeAvatar: '更换头像',
    changePassword: '修改密码',
  },

  // 3D 查看器
  viewer: {
    loading: '加载中...',
    error: '加载失败',
    retry: '重试',
    controls: '操作提示',
    dragRotate: '拖拽旋转',
    scrollZoom: '滚轮缩放',
    poweredBy: 'Powered by Spark 2.0',
  },

  // 通用
  common: {
    loading: '加载中...',
    error: '出错了',
    retry: '重试',
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    view: '查看',
    close: '关闭',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    search: '搜索',
    noData: '暂无数据',
  },

  // 统计
  stats: {
    views: '浏览',
    likes: '点赞',
    downloads: '下载',
  },
};

export type Translations = typeof zhCN;
