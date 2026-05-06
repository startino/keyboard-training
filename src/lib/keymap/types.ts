export interface ParsedKeymap {
  layers: Layer[]
  thumbCluster: ThumbKey[]
  homeRowMods: HomeRowMod[]
  combos: Combo[]
}

export interface Layer {
  name: string
  keys: Key[]
  thumbs: ThumbKey[]
}

export interface Key {
  position: number
  row: number
  col: number
  finger: string // 'LP'|'LR'|'LM'|'LI'|'LT'|'RT'|'RI'|'RM'|'RR'|'RP'
  tap: string
  hold: string
}

export interface ThumbKey {
  position: number
  finger: string // 'LT1'|'LT2'|'LT3'|'RT1'|'RT2'|'RT3'
  tap: string
  hold: string
}

export interface HomeRowMod {
  key: string
  modifier: string // 'GUI'|'ALT'|'CTRL'|'SHIFT'
  hand: 'L' | 'R'
}

export interface Combo {
  name: string
  keys: number[]
  output: string
}
