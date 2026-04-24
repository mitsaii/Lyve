export interface Post {
  id: string
  title: string
  content: string
  image_url?: string | null
  artist?: string | null
  concert_id?: string | null
  tags: string[]
  likes_count: number
  comments_count: number
  is_ai_generated: boolean
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  likes_count: number
  created_at: string
  // joined from auth.users via profiles (if available)
  user_display_name?: string
  user_avatar_url?: string
}
