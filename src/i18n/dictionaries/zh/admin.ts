export const admin = {
	// 工具条通用按钮
	save: '保存',
	saving: '保存中...',
	importKey: '导入密钥',
	cancel: '取消',
	edit: '编辑',
	add: '添加',
	done: '完成',
	delete: '删除',
	change: '更换',
	confirm: '确认',
	close: '关闭',
	category: '分类',

	// 保存结果 toast
	saveSuccess: '保存成功！',
	saveFailed: '保存失败: {message}',
	saveFailedShort: '保存失败',
	unknownError: '未知错误',
	readKeyFileFailed: '读取密钥文件失败',
	readKeyFailed: '读取密钥失败',
	keyImported: '密钥导入成功，请再次点击保存',

	// 发布进度 toast（push 服务共用）
	fetchingBranch: '正在获取分支信息...',
	preparingFiles: '正在准备文件...',
	creatingTree: '正在创建文件树...',
	creatingCommit: '正在创建提交...',
	updatingBranch: '正在更新分支...',
	publishSuccess: '发布成功！',

	// 博主页（bloggers）
	deleteConfirm: '确定要删除 {name} 吗？',
	statusRecent: '近期更新',
	statusDisconnected: '长期失联',

	// 博主编辑对话框
	bloggerNamePlaceholder: '博主名称',
	bloggerIntroPlaceholder: '博主介绍...',
	requiredFieldsMissing: '请填写所有必填项',
	updateSuccess: '更新成功',
	addSuccess: '添加成功',

	// 头像上传对话框
	selectAvatar: '选择头像',
	uploadImage: '上传图片',
	clickToUpload: '点击上传图片',
	orDivider: '或',
	imageUrl: '图片 URL',
	selectImageFile: '请选择图片文件',
	uploadOrUrlRequired: '请上传图片或输入 URL',

	// push-bloggers 专属
	uploadingAvatars: '正在上传头像...',
	avatarUploadIncomplete: '头像未上传完成：{names}',
	commitUpdateBloggers: '更新博主列表',

	// push-about 专属
	commitUpdateAbout: '更新关于页面',

	// 文章列表管理工具条
	selectAll: '全选',
	deselectAll: '取消全选',
	selectGroup: '全选该分组',
	deleteSelected: '删除(已选:{count}篇)',
	selectArticlesToDelete: '请选择要删除的文章',
	categoryNameRequired: '请输入分类名称',
	noChangesToSave: '没有需要保存的改动',

	// 分类弹窗
	articleCategories: '文章分类',
	categoryNamePlaceholder: '输入分类名称',
	addCategory: '新增分类',
	noCategories: '暂无分类',

	// save-blog-edits / batch-delete-blogs
	collectingFiles: '正在收集 {slug} 文件...',
	updatingIndex: '正在更新索引...',
	updatingCategories: '正在更新分类...',
	saveSuccessDeploy: '保存成功！请等待页面部署后刷新',
	deleteSuccessDeploy: '删除成功！请等待页面部署后刷新',
	atLeastOneArticle: '需要至少选择一篇文章',
	commitDeleteArticles: '删除:{items}',
	commitUpdateIndex: '更新索引',
	commitUpdateCategories: '更新分类',
	commitDeleteArticle: '删除文章: {slugs}',
	commitBatchDeleteArticles: '批量删除文章: {slugs}',

	// 关于页编辑态
	titlePlaceholder: '标题',
	descriptionPlaceholder: '描述',
	markdownPlaceholder: 'Markdown 内容',
	titlePreview: '标题预览',
	descriptionPreview: '描述预览',
	previewRendering: '预览渲染中...',
	preview: '预览',
	continueEditing: '继续编辑',

	// 首页布局编辑
	homeLayoutEditingHint: '正在编辑首页布局，拖拽卡片调整位置',
	homeLayoutSaved: '首页布局偏移已保存（尚未提交到远程配置）',
	homeLayoutCancelled: '已取消此次拖拽布局修改',
	saveOffsets: '保存偏移',

	// 写文章按钮
	writeArticle: '写文章'
}
