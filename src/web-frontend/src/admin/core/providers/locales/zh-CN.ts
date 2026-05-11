/**
 * Web3D Admin - 国际化资源（中文）
 */

export default {
  // 通用
  common: {
    confirm: '确定',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    create: '创建',
    view: '查看',
    search: '搜索',
    reset: '重置',
    submit: '提交',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    loading: '加载中...',
    success: '操作成功',
    error: '操作失败',
    warning: '警告',
    info: '提示',
    noData: '暂无数据',
    total: '共 {total} 条',
    page: '第 {current} / {total} 页',
  },

  // 导航菜单
  menu: {
    dashboard: '仪表盘',
    userManagement: '用户管理',
    userList: '用户列表',
    modelManagement: '模型管理',
    modelList: '模型列表',
    modelReview: '模型审核',
    templateManagement: '模板管理',
    templateList: '模板列表',
    templateEditor: '模板编辑器',
    systemSettings: '系统设置',
    operationLogs: '操作日志',
  },

  // 用户管理
  user: {
    title: '用户管理',
    username: '用户名',
    email: '邮箱',
    phone: '手机号',
    role: '角色',
    status: '状态',
    avatar: '头像',
    createdAt: '创建时间',
    updatedAt: '更新时间',
    lastLoginAt: '最后登录',
    actions: '操作',
    createUser: '创建用户',
    editUser: '编辑用户',
    deleteUser: '删除用户',
    resetPassword: '重置密码',
    roles: {
      super_admin: '超级管理员',
      admin: '管理员',
      editor: '编辑者',
      viewer: '查看者',
    },
    statusOptions: {
      active: '活跃',
      inactive: '未激活',
      suspended: '已禁用',
    },
    messages: {
      createSuccess: '用户创建成功',
      updateSuccess: '用户更新成功',
      deleteSuccess: '用户删除成功',
      deleteConfirm: '确定要删除该用户吗？',
      passwordResetSuccess: '密码重置成功',
    },
  },

  // 模型管理
  model: {
    title: '模型管理',
    name: '模型名称',
    description: '描述',
    category: '分类',
    format: '格式',
    fileSize: '文件大小',
    polygonCount: '面数',
    textureCount: '贴图数量',
    status: '状态',
    thumbnail: '缩略图',
    preview: '预览',
    download: '下载',
    review: '审核',
    approve: '通过',
    reject: '驳回',
    rejectionReason: '驳回原因',
    createdBy: '创建者',
    reviewedBy: '审核者',
    reviewedAt: '审核时间',
    categories: {
      character: '角色',
      scene: '场景',
      prop: '道具',
      vehicle: '载具',
      other: '其他',
    },
    statusOptions: {
      pending: '待审核',
      approved: '已通过',
      rejected: '已驳回',
      archived: '已归档',
    },
    formats: {
      glb: 'GLB',
      gltf: 'GLTF',
      fbx: 'FBX',
      obj: 'OBJ',
      ply: 'PLY',
      splat: 'Splat (3DGS)',
    },
    messages: {
      reviewSuccess: '审核成功',
      approveSuccess: '模型已通过',
      rejectSuccess: '模型已驳回',
      deleteConfirm: '确定要删除该模型吗？',
    },
  },

  // 模板管理
  template: {
    title: '模板管理',
    name: '模板名称',
    description: '描述',
    category: '分类',
    version: '版本',
    status: '状态',
    usageCount: '使用次数',
    layout: '布局',
    components: '组件',
    publish: '发布',
    unpublish: '取消发布',
    rollback: '回滚',
    versionHistory: '版本历史',
    changeLog: '变更日志',
    categories: {
      landing: '落地页',
      gallery: '画廊',
      editor: '编辑器',
      custom: '自定义',
    },
    statusOptions: {
      draft: '草稿',
      published: '已发布',
      archived: '已归档',
    },
    messages: {
      publishSuccess: '模板发布成功',
      rollbackSuccess: '版本回滚成功',
      deleteConfirm: '确定要删除该模板吗？',
    },
  },

  // 登录页面
  login: {
    title: 'Web3D 管理后台',
    subtitle: '欢迎登录',
    username: '用户名',
    password: '密码',
    rememberMe: '记住我',
    forgotPassword: '忘记密码？',
    loginButton: '登录',
    messages: {
      usernameRequired: '请输入用户名',
      passwordRequired: '请输入密码',
      loginSuccess: '登录成功',
      loginFailed: '登录失败',
    },
  },

  // 错误页面
  error: {
    notFound: '页面不存在',
    forbidden: '无权访问',
    internalError: '服务器内部错误',
    backToHome: '返回首页',
  },

  // 验证消息
  validation: {
    required: '{field}不能为空',
    email: '请输入有效的邮箱地址',
    phone: '请输入有效的手机号',
    minLength: '{field}长度不能少于{min}个字符',
    maxLength: '{field}长度不能超过{max}个字符',
    pattern: '{field}格式不正确',
  },

  // AI生成实验模块
  experimental: {
    title: 'AI生成实验',
    generation: {
      title: '3D生成',
      subtitle: '使用 AI 从图片生成 3D 模型',
    },
    threepipeEditor: {
      title: 'Threepipe 3D编辑器',
      subtitle: '基于 threepipe 的全功能 3D 编辑器，支持多格式拖拽导入',
      initLoading: '初始化 3D 编辑器...',
      switchLangToEn: '切换到英文',
      switchLangToZh: '切换到中文',
    },
    supersplat: {
      title: 'SuperSplat 编辑器',
      subtitle: '3D 高斯泼溅点云编辑器',
      loading: '正在加载 SuperSplat 编辑器...',
      loadError: '编辑器加载失败，请确保后端服务运行在 http://localhost:8000',
      loadErrorTitle: '加载错误',
    },
    officialModel: {
      title: '3D官方模型',
      subtitle: '浏览和管理官方提供的 3D 模型资源',
    },
  },
};
