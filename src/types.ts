type Bot = {
  fallbackIntentIndex: number,
  intents: Intent[],
  entities: {},
};

type Intent = {
  index: number,
  name: string,
  usersays?: any[],
  score?: number,
  parameters?: object,
  slotFillingResponse?: any[],
  contextMemory?: object,
  responses?: any[],
  fullIntent?: {},
  contexts?: any[],
};

export { Bot, Intent };
