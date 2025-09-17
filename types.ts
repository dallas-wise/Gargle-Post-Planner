export interface Post {
  title: string;
  caption: string;
}

export interface WeekPlan {
  week: number;
  posts: Post[];
}