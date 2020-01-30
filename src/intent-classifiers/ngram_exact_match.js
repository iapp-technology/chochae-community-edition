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
n-grams String Exact Match
*/


const _ = require("lodash");
const wordcut = require("wordcut");
wordcut.init();
const Log = require("../utils/log");
let log = new Log("ngram_exact_match.js");

module.exports = function(sender, text, intents) {
  //Processing text query
  let ug = wordcut.cut(text.trim().toLowerCase()).split("|");
  let bg = [];
  let tg = [];
  let qg = [];

  for (let i = 0; i < ug.length - 1; i++) {
    bg.push(ug[i] + ug[i + 1]);
  }
  for (let i = 0; i < ug.length - 2; i++) {
    tg.push(ug[i] + ug[i + 1] + ug[i + 2]);
  }
  for (let i = 0; i < ug.length - 3; i++) {
    qg.push(ug[i] + ug[i + 1] + ug[i + 2] + ug[i + 3]);
  }

  log.debug("Input: " + text);
  log.debug("Quad seq: " + qg);
  log.debug("Trigram seq: " + tg);
  log.debug("Bigram seq: " + bg);
  log.debug("Unigram seq: " + ug);


  log.debug("--Quadgram--");
  for (let i in intents) {
    log.debug("Checking conversation ["+i+"]:"+intents[i].name);
    log.debug("Usersay:" + intents[i].usersays);
    log.debug("Intersection:" + _.intersection(qg, intents[i].usersays));
    if (_.intersection(qg, intents[i].usersays).length > 0) {
      return intents[i];
    }
    log.debug("---------");
  }

  log.debug("--Trigram--");
  for (let i in intents) {
    log.debug("Checking conversation ["+i+"]:"+intents[i].name);
    log.debug("Usersay:" + intents[i].usersays);
    log.debug("Intersection:" + _.intersection(tg, intents[i].usersays));
    if (_.intersection(tg, intents[i].usersays).length > 0) {
      return intents[i];
    }
    log.debug("---------");
  }

  log.debug("--Bigram--");
  for (let i in intents) {
    log.debug("Checking conversation ["+i+"]:"+intents[i].name);
    log.debug("Usersay:" + intents[i].usersays);
    log.debug("Intersection:" + _.intersection(bg, intents[i].usersays));
    if (_.intersection(bg, intents[i].usersays).length > 0) {
      return intents[i];
    }
    log.debug("---------");
  }

  log.debug("--Unigram--");
  for (let i in intents) {
    log.debug("Checking conversation ["+i+"]:"+intents[i].name);
    log.debug("Usersay:" + intents[i].usersays);
    log.debug("Intersection:" + _.intersection(ug, intents[i].usersays));
    if (_.intersection(ug, intents[i].usersays).length > 0) {
      return intents[i];
    }
    log.debug("---------");
  }

  //Default response;
  return null;
};
