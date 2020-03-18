type Bot = {
  fallbackIntentIndex: number,
  intents: Intent[],
  entities: Entities,
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

type Entity = {
  value: string,
  synonym: string[],
};

type Entities = {
  [key:string]: Entity[],
};

export { Bot, Intent, Entity, Entities };
