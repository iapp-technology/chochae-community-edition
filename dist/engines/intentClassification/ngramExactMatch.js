'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
/*
Intent Classification Engine
Simple N-grams String Exact Match
*/
const lodash_1 = __importDefault(require("lodash"));
const wordcut_1 = __importDefault(require("wordcut"));
wordcut_1.default.init();
const log_1 = __importDefault(require("../../utils/log"));
const log = new log_1.default('ngramExactMatch.ts');
log.enable = false;
function ngramExactMatch(sender, text, intents, bot) {
    // Processing text query
    const ug = wordcut_1.default.cut(text.trim().toLowerCase()).split('|');
    const bg = [];
    const tg = [];
    const qg = [];
    for (let i = 0; i < ug.length - 1; i++) {
        bg.push(ug[i] + ug[i + 1]);
    }
    // tslint:disable:no-magic-numbers
    for (let i = 0; i < ug.length - 2; i++) {
        tg.push(ug[i] + ug[i + 1] + ug[i + 2]);
    }
    for (let i = 0; i < ug.length - 3; i++) {
        qg.push(ug[i] + ug[i + 1] + ug[i + 2] + ug[i + 3]);
    }
    log.debug('Input: ' + text);
    log.debug('Quad seq: ' + qg);
    log.debug('Trigram seq: ' + tg);
    log.debug('Bigram seq: ' + bg);
    log.debug('Unigram seq: ' + ug);
    log.debug('--Quadgram--');
    for (const i in intents) {
        if (intents.hasOwnProperty(i)) {
            log.debug('Checking conversation [' + i + ']:' + intents[i].name);
            log.debug('Usersay:' + intents[i].usersays);
            log.debug('Intersection:' + lodash_1.default.intersection(qg, intents[i].usersays));
            if (lodash_1.default.intersection(qg, intents[i].usersays).length > 0) {
                return intents[i];
            }
            log.debug('---------');
        }
    }
    log.debug('--Trigram--');
    for (const i in intents) {
        if (intents.hasOwnProperty(i)) {
            log.debug('Checking conversation [' + i + ']:' + intents[i].name);
            log.debug('Usersay:' + intents[i].usersays);
            log.debug('Intersection:' + lodash_1.default.intersection(tg, intents[i].usersays));
            if (lodash_1.default.intersection(tg, intents[i].usersays).length > 0) {
                return intents[i];
            }
            log.debug('---------');
        }
    }
    log.debug('--Bigram--');
    for (const i in intents) {
        if (intents.hasOwnProperty(i)) {
            log.debug('Checking conversation [' + i + ']:' + intents[i].name);
            log.debug('Usersay:' + intents[i].usersays);
            log.debug('Intersection:' + lodash_1.default.intersection(bg, intents[i].usersays));
            if (lodash_1.default.intersection(bg, intents[i].usersays).length > 0) {
                return intents[i];
            }
            log.debug('---------');
        }
    }
    log.debug('--Unigram--');
    for (const i in intents) {
        if (intents.hasOwnProperty(i)) {
            log.debug('Checking conversation [' + i + ']:' + intents[i].name);
            log.debug('Usersay:' + intents[i].usersays);
            log.debug('Intersection:' + lodash_1.default.intersection(ug, intents[i].usersays));
            if (lodash_1.default.intersection(ug, intents[i].usersays).length > 0) {
                return intents[i];
            }
            log.debug('---------');
        }
    }
    // Default response;
    return null;
}
exports.default = ngramExactMatch;
//# sourceMappingURL=ngramExactMatch.js.map