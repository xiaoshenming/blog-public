export interface MusicTrack {
	name: string
	artist: string
	url: string
	pic?: string
	lrc?: string
}

export type PlayMode = 'list' | 'one' | 'random'

export const musicConfig = {
	server: 'netease',
	type: 'playlist',
	playlistId: '8282573592',
	volume: 0.7,
	playMode: 'list' as PlayMode,
	apiEndpoints: ['https://music.3e0.cn/?server=:server&type=:type&id=:id', 'https://api.qijieya.cn/meting/?server=:server&type=:type&id=:id'],
	localPlaylist: [
		{
			name: 'Christmas',
			artist: '本地音乐',
			url: '/music/christmas.m4a'
		}
	] satisfies MusicTrack[]
}
