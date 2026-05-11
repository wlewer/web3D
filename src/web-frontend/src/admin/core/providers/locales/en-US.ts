/**
 * Web3D Admin - Internationalization Resources (English)
 */

export default {
  // Common
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    view: 'View',
    search: 'Search',
    reset: 'Reset',
    submit: 'Submit',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    noData: 'No Data',
    total: 'Total {total} items',
    page: 'Page {current} / {total}',
  },

  // Navigation Menu
  menu: {
    dashboard: 'Dashboard',
    userManagement: 'User Management',
    userList: 'User List',
    modelManagement: 'Model Management',
    modelList: 'Model List',
    modelReview: 'Model Review',
    templateManagement: 'Template Management',
    templateList: 'Template List',
    templateEditor: 'Template Editor',
    systemSettings: 'System Settings',
    operationLogs: 'Operation Logs',
  },

  // User Management
  user: {
    title: 'User Management',
    username: 'Username',
    email: 'Email',
    phone: 'Phone',
    role: 'Role',
    status: 'Status',
    avatar: 'Avatar',
    createdAt: 'Created At',
    updatedAt: 'Updated At',
    lastLoginAt: 'Last Login',
    actions: 'Actions',
    createUser: 'Create User',
    editUser: 'Edit User',
    deleteUser: 'Delete User',
    resetPassword: 'Reset Password',
    roles: {
      super_admin: 'Super Admin',
      admin: 'Admin',
      editor: 'Editor',
      viewer: 'Viewer',
    },
    statusOptions: {
      active: 'Active',
      inactive: 'Inactive',
      suspended: 'Suspended',
    },
    messages: {
      createSuccess: 'User created successfully',
      updateSuccess: 'User updated successfully',
      deleteSuccess: 'User deleted successfully',
      deleteConfirm: 'Are you sure to delete this user?',
      passwordResetSuccess: 'Password reset successfully',
    },
  },

  // Model Management
  model: {
    title: 'Model Management',
    name: 'Model Name',
    description: 'Description',
    category: 'Category',
    format: 'Format',
    fileSize: 'File Size',
    polygonCount: 'Polygon Count',
    textureCount: 'Texture Count',
    status: 'Status',
    thumbnail: 'Thumbnail',
    preview: 'Preview',
    download: 'Download',
    review: 'Review',
    approve: 'Approve',
    reject: 'Reject',
    rejectionReason: 'Rejection Reason',
    createdBy: 'Created By',
    reviewedBy: 'Reviewed By',
    reviewedAt: 'Reviewed At',
    categories: {
      character: 'Character',
      scene: 'Scene',
      prop: 'Prop',
      vehicle: 'Vehicle',
      other: 'Other',
    },
    statusOptions: {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      archived: 'Archived',
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
      reviewSuccess: 'Review completed',
      approveSuccess: 'Model approved',
      rejectSuccess: 'Model rejected',
      deleteConfirm: 'Are you sure to delete this model?',
    },
  },

  // Template Management
  template: {
    title: 'Template Management',
    name: 'Template Name',
    description: 'Description',
    category: 'Category',
    version: 'Version',
    status: 'Status',
    usageCount: 'Usage Count',
    layout: 'Layout',
    components: 'Components',
    publish: 'Publish',
    unpublish: 'Unpublish',
    rollback: 'Rollback',
    versionHistory: 'Version History',
    changeLog: 'Change Log',
    categories: {
      landing: 'Landing Page',
      gallery: 'Gallery',
      editor: 'Editor',
      custom: 'Custom',
    },
    statusOptions: {
      draft: 'Draft',
      published: 'Published',
      archived: 'Archived',
    },
    messages: {
      publishSuccess: 'Template published successfully',
      rollbackSuccess: 'Version rolled back successfully',
      deleteConfirm: 'Are you sure to delete this template?',
    },
  },

  // Login Page
  login: {
    title: 'Web3D Admin',
    subtitle: 'Welcome Back',
    username: 'Username',
    password: 'Password',
    rememberMe: 'Remember Me',
    forgotPassword: 'Forgot Password?',
    loginButton: 'Login',
    messages: {
      usernameRequired: 'Please enter username',
      passwordRequired: 'Please enter password',
      loginSuccess: 'Login successful',
      loginFailed: 'Login failed',
    },
  },

  // Error Pages
  error: {
    notFound: 'Page Not Found',
    forbidden: 'Access Forbidden',
    internalError: 'Internal Server Error',
    backToHome: 'Back to Home',
  },

  // Validation Messages
  validation: {
    required: '{field} is required',
    email: 'Please enter a valid email address',
    phone: 'Please enter a valid phone number',
    minLength: '{field} must be at least {min} characters',
    maxLength: '{field} must be at most {max} characters',
    pattern: '{field} format is invalid',
  },

  // AI Generation Lab Module
  experimental: {
    title: 'AI Generation Lab',
    generation: {
      title: '3D Generation',
      subtitle: 'Generate 3D models from images using AI',
    },
    threepipeEditor: {
      title: 'Threepipe 3D Editor',
      subtitle: 'Full-featured 3D editor based on threepipe, supports multi-format drag & drop import',
      initLoading: 'Initializing 3D Editor...',
      switchLangToEn: 'Switch to English',
      switchLangToZh: 'Switch to Chinese',
    },
    supersplat: {
      title: 'SuperSplat Editor',
      subtitle: '3D Gaussian Splatting point cloud editor',
      loading: 'Loading SuperSplat Editor...',
      loadError: 'Editor failed to load, please ensure backend is running at http://localhost:8000',
      loadErrorTitle: 'Load Error',
    },
    officialModel: {
      title: '3D Official Models',
      subtitle: 'Browse and manage official 3D model resources',
    },
  },
};
