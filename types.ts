export interface Post {
  title: string;
  caption: string;
  photoIdeas?: string;
}

export interface WeekPlan {
  week: number;
  posts: Post[];
}