export const write = {
	// 状态提示
	loading: '加载中...',
	invalidId: '无效的博客 ID',
	loadFailed: '加载博客失败',
	loadSuccess: '博客加载成功',
	untitled: '未命名',

	// 编辑器
	titlePlaceholder: '标题',
	slugPlaceholder: 'slug（xx-xx）',
	mdPlaceholder: 'Markdown 内容',

	// 操作条
	editMode: '编辑模式',
	update: '更新',
	publish: '发布',
	importKey: '导入密钥',
	importKeyFirst: '请先导入密钥',
	importMd: '导入 MD',
	mdImported: '已导入 Markdown 文件',
	mdImportFailed: '导入失败，请重试',
	cancel: '取消',
	delete: '删除',
	preview: '预览',
	closePreview: '关闭预览',
	discardConfirm: '放弃本次修改吗？',
	deleteConfirm: '确定删除当前文章吗？该操作不可恢复。',
	deleteConfirmTitle: '确定删除《{title}》吗？该操作不可恢复。',

	// 操作结果
	publishSuccess: '发布成功',
	updateSuccess: '更新成功',
	published: '发布成功！',
	operationFailed: '操作失败',
	deleteFailed: '删除失败',
	deleteSuccess: '删除成功！请等待页面部署后刷新',
	missingSlug: '缺少 slug，无法删除',
	slugRequired: '需要 slug',
	slugImmutable: '编辑模式下不支持修改 slug，请保持原 slug 不变',
	notFoundOrDeleted: '文章不存在或已删除',

	// 封面
	cover: '封面',
	coverSet: '已设置封面',
	dropImageOnly: '请拖入图片文件',

	// 元信息
	meta: '元信息',
	uncategorized: '未分类',
	summaryPlaceholder: '为这篇文章写一段简短摘要',
	date: '日期',
	hiddenLabel: '隐藏此文章（仅管理员可见）',

	// 图片管理
	images: '图片管理',
	compressionTool: '压缩工具',
	add: '添加',
	imageExists: '该图片已在列表中',
	imageDuplicate: '图片已存在，不重复添加',

	// 标签输入
	addTagPlaceholder: '添加标签（按回车）',

	// 发布 / 删除过程提示
	fetchingBranch: '正在获取分支信息...',
	preparingFiles: '正在准备文件...',
	uploadingImages: '正在上传图片...',
	creatingFiles: '正在创建文件...',
	creatingTree: '正在创建文件树...',
	creatingCommit: '正在创建提交...',
	updatingBranch: '正在更新分支...',
	updatingIndex: '正在更新索引...',
	collectingFiles: '正在收集文章文件...',
	commitCreate: '新增文章: {slug}',
	commitUpdate: '更新文章: {slug}',
	commitDelete: '删除文章: {slug}'
}
