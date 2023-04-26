function isQuestion(input: string): boolean {
  const questionWords = [
    'who',
    'what',
    'where',
    'when',
    'why',
    'how',
    'which',
    'whose',
    'whom',
    '谁',
    '什么',
    '哪里',
    '何时',
    '为什么',
    '如何',
    '哪个',
    '哪些',
    '谁的',
  ]

  return questionWords.some(word => input.toLowerCase().includes(word)) || input.trim().endsWith('？') || input.trim().endsWith('?')
}

const questionResponses: string[] = [
  '不知道。',
  '不了解。',
  '不清楚。',
  '不熟悉。',
  '不懂。',
  '不认识。',
  '不理解。',
  '不明白。',
]

function getRandomQuestion(): string {
  const randomIndex = Math.floor(Math.random() * questionResponses.length)
  return questionResponses[randomIndex]
}

function isImperative(input: string): boolean {
  const imperativeVerbs = [
    'go',
    'stop',
    'come',
    'take',
    'get',
    'eat',
    'drink',
    'run',
    'walk',
    'play',
    'work',
    'rest',
    'listen',
    'speak',
    'read',
    'write',
    '走',
    '停',
    '来',
    '拿',
    '吃',
    '喝',
    '跑',
    '走',
    '玩',
    '工作',
    '休息',
    '听',
    '说',
    '读',
    '写',
  ]

  return imperativeVerbs.some(verb => input.toLowerCase().includes(verb))
}

const imperativeResponses: string[] = ['不能。', '不可以。', '不行。', '都不行。', '也不可以。']

function getRandomImperative(): string {
  const randomIndex = Math.floor(Math.random() * imperativeResponses.length)
  return imperativeResponses[randomIndex]
}

function isGreeting(input: string): boolean {
  const greetings = [
    'hi',
    'hello',
    'hey',
    'nihao',
    '你好',
    '您好',
  ]

  return greetings.some(greeting => input.toLowerCase().includes(greeting))
}

const greetingResponses: string[] = ['您好！', 'Hello!', 'Hi!']

function getRandomGreeting(): string {
  const randomIndex = Math.floor(Math.random() * greetingResponses.length)
  return greetingResponses[randomIndex]
}

export function chatBot(input: string): string {
  // By Copilot, thanks Copilot!
  if (input.toLowerCase().includes('其他') || input.toLowerCase().includes('的吗') || input.toLowerCase().includes('别的') || input.toLowerCase().includes('还会') || input.toLowerCase().includes('会说') || input.toLowerCase().includes('你还'))
    return '请再问一遍。'

  if (isGreeting(input))
    return getRandomGreeting()

  if (isImperative(input))
    return getRandomImperative()

  if (isQuestion(input))
    return getRandomQuestion()

  return '请再问一遍。'
}
