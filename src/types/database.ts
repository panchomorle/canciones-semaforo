export interface Song {
  id: string
  title: string
  artist: string
  is_played: boolean
  created_at: string
}

export interface Dedication {
  id: string
  song_id: string
  recipient_name: string
  client_token?: string
  is_mine?: boolean
  created_at: string
  songs?: Song
}

export interface PublicDedication {
  id: string
  song_id: string
  recipient_name: string
  is_mine: boolean
  created_at: string
}
