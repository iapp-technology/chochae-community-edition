'use strict';
/*
Chochae Community Edition - Thai Chatbot Building Platform
Copyright (C) 2020  iApp Technology Co., Ltd.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Bot, Intent, Entity, Entities } from '../../types';
import naiveBaye from './naiveBaye';
import _ from 'lodash';

import Log from './../../utils/log';
const log = new Log('intentClassifier.ts');

export default class intentClassifier{
  bot: Bot;
  contextMemory: object = {};
  intents: Intent[] = [];
  entities: Entities;
  parameterValue: object = {};
  activeSlotfillingIndex: number = -1;
  naiveBaye:naiveBaye;

  constructor(bot:Bot, contextMemory:object = {}){
    this.bot = bot;
    this.contextMemory = contextMemory;

    /**
     * Convert bot -> intents and Intents Filtering (due to Context)
     */
    for (let i = 0; i < this.bot.intents.length; i++) {
      // Filter out intents that do not have matched context.
      // If there is input context and not exist in the context_memory
      if (
        this.bot.intents[i].contexts!.length > 0 &&
        _.intersection(Object.keys(contextMemory), this.bot.intents[i].contexts)
          .length === 0
      ) {
        // Do not add it into intents array
        log.p('Filter out: ', bot.intents[i].name);
        continue;
      }
      const intent: Intent = {
        index: i,
        name: bot.intents[i].name,
        usersays: [],
      };

      // Dialogflow annotate parameters inside the training phase. Ignore for now.
      // Get entire sentence as the training phase
      for (let l = 0; l < bot.intents[i].usersays!.length; l++) {
        let entireConversation: string = '';
        for (let k = 0; k < bot.intents[i].usersays![l].data!.length; k++) {
          entireConversation += bot.intents[i].usersays[l].data[k].text;
        }
        intent!.usersays!.push(entireConversation);
      }
      this.intents.push(intent);
      this.entities = bot.entities;
    }

    log.d('Intents', this.intents);
    this.naiveBaye = new naiveBaye(this.intents, this.bot);
  }

  classify(sender: string, text: string){
    // Check if context_memory is less than 0, delete it.
    for (const i in this.contextMemory) {
      if (this.contextMemory[i] <= 0) {
        delete this.contextMemory[i];
      }
    }

    /**
     * Intent Classification
     */
    let matchedIntent: Intent | null = null;

    /**
     * Call Intent Classifciation Algorithms
     */
    // Check if in the process of the slotfilling or not?
    if (this.activeSlotfillingIndex >= 0) {
      matchedIntent = {
        name: this.bot.intents[this.activeSlotfillingIndex].name,
        index: this.activeSlotfillingIndex,
        score: 1.0,
      };

      // Reset Active Slot Filling Index
      this.activeSlotfillingIndex = -1;
    }else{
      matchedIntent = this.naiveBaye.classify(sender, text);
    }

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

        // Loop through the entities
        for (const key in this.entities){
          if (this.entities.hasOwnProperty(key)){
            const entity = this.entities[key];
            // TODO: Matching with entities
          }
        }

        // Matching pattern
        let matches: RegExpMatchArray | null = null;
        if (p.dataType === '@sys.number-integer') {
          matches = text.match(/\d+/g);
        } else if (p.dataType === '@sys.number') {
          matches = text.match(/\d+(\.\d+)?/g);
        } else if (p.dataType === '@sys.any') {
          matches = text.match(/.+/g);
        } else {
          // TODO: Fill in more datatype here.
        }

        log.f('Matches', matches);

        // TODO: Find the suitable index from parameters_value
        let suitableIndex = 0;
        for (let l = 0; l < parameters.length; l++) {
          if (
            parameters[l].dataType === p.dataType &&
            parametersMatchThisTime[parameters[l].name]
          ) {
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
          this.activeSlotfillingIndex = matchedIntent.index;
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
    if (
      this.bot.intents[matchedIntent.index].responses[0] &&
      this.bot.intents[matchedIntent.index].responses[0].resetContexts
    ) {
      this.contextMemory = {};
    }

    // affectedContexts
    for (
      let l = 0;
      l < this.bot.intents[matchedIntent.index].responses[0].affectedContexts.length;
      l++
    ) {
      const context =
        this.bot.intents[matchedIntent.index].responses[0].affectedContexts[l];
      this.contextMemory[context.name] = context.lifespan;
    }

    matchedIntent.contextMemory = this.contextMemory;
    // Show Matched Intent
    log.p('MatchedIntent: ', matchedIntent);

    return matchedIntent;
  }
}
