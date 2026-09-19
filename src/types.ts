/** 一次「点击即记录」产生的数据 */
export interface LearningRecord {
  id: string;
  /** 对应 Activity.id */
  activityId: string;
  /** 记录时间戳（毫秒） */
  at: number;
  /** 可选备注：这一刻具体做了什么，比如「前缀树」 */
  note?: string;
}

/** 用户自定义的学习内容 */
export interface Activity {
  id: string;
  label: string;
  emoji: string;
  /** #RRGGBB 格式的主色 */
  color: string;
}
