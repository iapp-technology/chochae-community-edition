'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const naiveBaye_1 = __importDefault(require("./naiveBaye"));
const lodash_1 = __importDefault(require("lodash"));
const log_1 = __importDefault(require("./../../utils/log"));
const log = new log_1.default('intentClassifier.ts');
class intentClassifier {
    constructor(bot, contextMemory = {}) {
        this.contextMemory = {};
        this.intents = [];
        this.parameterValue = {};
        this.activeSlotfillingIndex = -1;
        this.bot = bot;
        this.contextMemory = contextMemory;
        /**
         * Convert bot -> intents and Intents Filtering (due to Context)
         */
        for (let i = 0; i < this.bot.intents.length; i++) {
            // Filter out intents that do not have matched context.
            // If there is input context and not exist in the context_memory
            if (this.bot.intents[i].contexts.length > 0 &&
                lodash_1.default.intersection(Object.keys(contextMemory), this.bot.intents[i].contexts)
                    .length === 0) {
                // Do not add it into intents array
                log.p('Filter out: ', bot.intents[i].name);
                continue;
            }
            const intent = {
                index: i,
                name: bot.intents[i].name,
                usersays: [],
            };
            // Dialogflow annotate parameters inside the training phase. Ignore for now.
            // Get entire sentence as the training phase
            for (let l = 0; l < bot.intents[i].usersays.length; l++) {
                let entireConversation = '';
                for (let k = 0; k < bot.intents[i].usersays[l].data.length; k++) {
                    entireConversation += bot.intents[i].usersays[l].data[k].text;
                }
                intent.usersays.push(entireConversation);
            }
            this.intents.push(intent);
        }
        log.d('Intents', this.intents);
        this.naiveBaye = new naiveBaye_1.default(this.intents, this.bot);
    }
    classify(sender, text) {
        // Check if in the process of the slotfilling or not?
        if (this.activeSlotfillingIndex >= 0) {
            const mIntent = {
                name: this.bot.intents[this.activeSlotfillingIndex].name,
                index: this.activeSlotfillingIndex,
                score: 1.0,
            };
            return mIntent;
        }
        // Check if context_memory is less than 0, delete it.
        for (const i in this.contextMemory) {
            if (this.contextMemory[i] <= 0) {
                delete this.contextMemory[i];
            }
        }
        /**
         * Intent Classification
         */
        let matchedIntent = null;
        /**
         * Call Intent Classifciation Algorithms
         */
        matchedIntent = this.naiveBaye.classify(sender, text);
        /**
         * Fallback Intent
         */
        if (!matchedIntent) {
            log.p('Fallback intent:', this.bot.fallbackIntentIndex);
            matchedIntent = {
                name: this.bot.intents[this.bot.fallbackIntentIndex].name,
                index: this.bot.fallbackIntentIndex,
                score: 0.0,
            };
            log.p(matchedIntent);
        }
        /**
         * Detecting slot filling
         *
         * "parameters": [
              {
                "id": "db9aa375-235a-41f3-9287-04c850b1e585",
                "required": true,
                "dataType": "@sys.number-integer",
                "name": "Something",
                "value": "",
                "prompts": [
                  {
                    "lang": "th",
                    "value": "This is something is enter!!"
                  },
                  {
                    "lang": "th",
                    "value": "Test please enter"
                  }
                ]
              }
            ],
        *
        */
        // TODO: Remove => let parameters_value = {};
        const parametersMatchThisTime = {};
        if (this.bot.intents[matchedIntent.index].responses[0].parameters) {
            const parameters = this.bot.intents[matchedIntent.index].responses[0].parameters;
            for (let i = 0; i < parameters.length; i++) {
                const p = parameters[i];
                // If already found parameters, skip.
                if (this.parameterValue[p.name]) {
                    continue;
                }
                // Matching pattern
                let matches = null;
                if (p.dataType === '@sys.number-integer') {
                    matches = text.match(/\d+/g);
                }
                else if (p.dataType === '@sys.any') {
                    matches = text.match(/.+/g);
                }
                else {
                    // TODO: Fill in more datatype here.
                }
                // TODO: Find the suitable index from parameters_value
                let suitableIndex = 0;
                for (let l = 0; l < parameters.length; l++) {
                    if (parameters[l].dataType === p.dataType &&
                        parametersMatchThisTime[parameters[l].name]) {
                        suitableIndex++;
                    }
                }
                if (matches && matches[suitableIndex]) {
                    parametersMatchThisTime[p.name] = matches[suitableIndex];
                }
            }
            log.p('Parameters match this time:');
            log.p(parametersMatchThisTime);
            Object.assign(this.parameterValue, parametersMatchThisTime);
            log.p('Parameters value:');
            log.p(this.parameterValue);
            matchedIntent.parameters = this.parameterValue;
            // Prompt back when parameters_value is not yet all fullfilled if required.
            for (let i = 0; i < parameters.length; i++) {
                const p = parameters[i];
                if (p.required && !this.parameterValue[p.name]) {
                    matchedIntent.slotFillingResponse = p.prompts;
                }
            }
        }
        /**
         * Context Post processing
         */
        // Remove the context lifespan by one
        for (const i in this.contextMemory) {
            if (this.contextMemory.hasOwnProperty(i)) {
                this.contextMemory[i]--;
                if (this.contextMemory[i] <= 0) {
                    delete this.contextMemory[i];
                }
            }
        }
        /**
         * Apply Context_Memory
         *
         *  "responses": [
          {
            "resetContexts": false,
            "action": "input.welcome",
            "affectedContexts": [
              {
                "name": "productSearch",
                "parameters": {},
                "lifespan": 5
              },
              {
                "name": "GreetSay",
                "parameters": {},
                "lifespan": 5
              }
            ],
        */
        // resetContexts
        if (this.bot.intents[matchedIntent.index].responses[0] &&
            this.bot.intents[matchedIntent.index].responses[0].resetContexts) {
            this.contextMemory = {};
        }
        // affectedContexts
        for (let l = 0; l < this.bot.intents[matchedIntent.index].responses[0].affectedContexts.length; l++) {
            const context = this.bot.intents[matchedIntent.index].responses[0].affectedContexts[l];
            this.contextMemory[context.name] = context.lifespan;
        }
        matchedIntent.contextMemory = this.contextMemory;
        // Show Matched Intent
        log.p('MatchedIntent: ', matchedIntent);
        return matchedIntent;
    }
}
exports.default = intentClassifier;
//# sourceMappingURL=intentClassifier.js.map