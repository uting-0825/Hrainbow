export type ChatStage = 'feel' | 'habit' | 'plans' | 'more' | 'birthday' | 'miss' | 'miss-retry' | 'promise' | 'done';

export const chatOptions: Record<Exclude<ChatStage, 'done'>, string[]> = {
  feel: ['挺激动的', '没什么感觉', '已经想退学了'],
  habit: ['还行', '一般般', '不告诉你'],
  plans: ['好好学习', '好好生活', '混吃等死'],
  more: ['找点好吃的', '到处玩', '暂时不知道'],
  birthday: ['谁啊', '终于想起来了？', '不知道，不认识'],
  miss: ['想', '很想', '特别特别想'],
  'miss-retry': ['很想', '特别想', '想死你了'],
  promise: ['不会', '当然不会', '怎么可能'],
};

