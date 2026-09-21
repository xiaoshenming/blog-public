export const dialogs = {
	// 通用按钮
	cancel: '取消',
	confirm: '确认',
	save: '保存',
	add: '添加',
	edit: '编辑',
	delete: '删除',
	manage: '管理',
	done: '完成',
	replace: '更换',
	or: '或',
	addMore: '继续添加',
	addItem: '新增',

	// 通用校验与结果提示
	fillAllRequired: '请填写所有必填项',
	addAtLeastOneTag: '请至少添加一个标签',
	addSuccess: '添加成功',
	updateSuccess: '更新成功',
	saveSuccess: '保存成功！',
	saveFailed: '保存失败: {message}',
	unknownError: '未知错误',
	publishSuccess: '发布成功！',
	listUpdated: '已更新列表',

	// 图片/图标选择对话框
	selectImageFile: '请选择图片文件',
	chooseImageTitle: '选择图片',
	chooseLogoTitle: '选择图标',
	uploadImageLabel: '上传图片',
	clickToUploadImage: '点击上传图片',
	imageUrlLabel: '图片 URL',
	uploadImageOrUrlRequired: '请上传图片或输入 URL',

	// 图片上传对话框
	uploadImageTitle: '上传图片',
	chooseImagesLabel: '选择图片（可多选）',
	clickToChooseImages: '点击选择图片',
	selectAtLeastOneImage: '请至少选择一张图片',
	imageCountTotal: '共 {count} 张',
	selectedImageCount: '已选择 {count} 张图片',
	descriptionLabel: '描述（可选，应用于本次所有图片）',
	descriptionPlaceholder: '这组图片的说明...',
	confirmUpload: '确认上传',

	// 项目创建对话框
	projectNamePlaceholder: '项目名称',
	yearPlaceholder: '年份',
	projectTagsPlaceholder: '标签，用逗号分隔（如：React, Vue）',
	projectDescriptionPlaceholder: '项目介绍...',
	githubUrlOptional: 'GitHub URL（可选）',
	npmUrlOptional: 'NPM URL（可选）',

	// 分享创建对话框
	resourceNamePlaceholder: '资源名称',
	shareTagsPlaceholder: '标签，用逗号分隔（如：图片, 工具）',
	shareDescriptionPlaceholder: '资源介绍...',

	// 卡片编辑态
	tagsCommaPlaceholder: '标签，用逗号分隔',
	websiteUrlPlaceholder: '网站 URL',

	// 句子管理
	enterSentence: '请输入句子',
	addAtLeastOneSentence: '请至少添加一句话',
	emptyContent: '暂无内容',
	importKey: '导入密钥',
	saving: '保存中...',
	readKeyFileFailed: '读取密钥文件失败',

	// GitHub 提交流程
	fetchingBranch: '正在获取分支信息...',
	preparingFiles: '正在准备文件...',
	uploadingImages: '正在上传图片...',
	uploadingLogos: '正在上传图标...',
	checkingRemovedFiles: '正在检查需要删除的文件...',
	creatingTree: '正在创建文件树...',
	creatingCommit: '正在创建提交...',
	updatingBranch: '正在更新分支...',
	commitSiteContent: '更新站点配置',
	commitPictures: '更新图床列表',
	commitProjects: '更新项目列表',
	commitShares: '更新分享列表',
	commitSnippets: '更新句子列表',
	uploadingFavicon: '正在上传 Favicon...',
	uploadingAvatar: '正在上传 Avatar...',
	uploadingArtImage: '正在上传 Art 图片 {id}...',
	uploadingBackgroundImage: '正在上传背景图片 {id}...',
	uploadingSocialButtonImage: '正在上传社交按钮图片 {id}...',
	logoNotUploaded: '图标未上传完成：{names}',

	// 认证
	usingCachedToken: '使用缓存的令牌...',
	usingOAuth2Token: '使用 OAuth2 令牌...',
	privateKeyRequired: '需要先设置私钥。请使用 useAuth().setPrivateKey()',
	signingJwt: '正在签发 JWT...',
	fetchingInstallation: '正在获取安装信息...',
	creatingInstallationToken: '正在创建安装令牌...'
}
