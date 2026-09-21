import { collections } from './collections'
import { common } from './common'
import { nav } from './nav'
import { home } from './home'
import { blog } from './blog'
import { about } from './about'
import { music } from './music'
import { toolbox } from './toolbox'

export const zh = { collections, common, nav, home, blog, about, music, toolbox }

export type Dictionary = typeof zh
