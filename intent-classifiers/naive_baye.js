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
Naive Bayes
https://en.wikipedia.org/wiki/Naive_Bayes_classifier
*/

const wordcut = require("wordcut");
wordcut.init();
const Log = require("../utils/log");
let log = new Log("naive_baye.js");
log.enable = false;
let bot = {};

module.exports = function(sender, text, intents, botname="botname") {
  if (!bot[botname]){
    bot[botname] = {};
    let all = "";
    let concat = {};

    //Processing text query
    for (let i in intents) {
      concat[i] = intents[i]
        .usersays
        .join("|").replace(/[&\/\\#,+()$~%'":*?<>{}0-9]/g, '') + "|";
      all += concat[i];
    }
    log.debug("All:", all);
    log.debug("Concat:", concat);
    
    bot[botname].all = all;
    bot[botname].concat = concat;
  }

  /**
   * Check Exact Match
   */
  var text = text && text
    .trim()
    .toLowerCase();

    for (let i in intents) {
      for (let l in intents[i].usersays) {
        let t = intents[i]
          .usersays[l]
          .trim()
          .toLowerCase();

        if (t == text) {
          intents[i].score = 1.00;
          return intents[i];
        }
      }
    }

  
  /**
   * Check Naive Baye
   */
  let score = {};

  // ta = term array
  let ta = wordcut
    .cut(text.replace(/[&\/\\#,+()$~%'":*?<>{}]/g, ''))
    .split("|");
  // log.debug("ta (term-array):", ta);

  // Clear stopwords; 
  // ta = _.difference(ta, stopwords); 
  // log.debug("ta (after clean stopwords):",ta);

  for (let i in intents) {
    score[i] = [];
  }

  //Generate n-gram sequence from 1-gram to 6-gram
  let seq = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: []
  };

  for (let l in seq) {
    let nl = parseInt(l);
    for (let i = 0; i < ta.length - (nl - 1); i++) {
      let tmp = "";
      for (let j = 0; j < nl; j++) {
        tmp += ta[i + j];
      }
      seq[l].push(tmp);
    }
  }

  log.p("Input:", ta);
  log.p("Seq:", seq);

  for (let k in seq) {
    let nk = parseInt(k);
    log.p("--" + nk + "--");
    for (let i in intents) {
        for (let l in seq[k]) {
          let q = seq[k][l].trim();
          if (q.length > 0) {
            try {
              let found_in_class = (bot && bot[botname] && bot[botname].concat[i] && bot[botname].concat[i].match(new RegExp(q, "g")) || []).length;
              let found_in_all = (bot && bot[botname] && bot[botname].all.match(new RegExp(q, "g")) || []).length;
              log.p("Query:", q, "Found in Class:", found_in_class, "Found in All:", found_in_all);
              if (found_in_all > 0) {
                score[i].push(Math.log10(((found_in_class*nk*nk)+1e-100)/found_in_all));
              }
            } catch (e) {
              log.f("Exception:", e);
            }
          }
      }
    }
  }

  log.f("Score:", score);

  let total = {};
  for (let i in score){
    if (!total[i]){
      total[i] = 0;
    }
    for (let l in score[i]){
      total[i] += score[i][l];
    }
    total[i] = 1.0*total[i]/score[i].length;
  }

  log.f("Total:", total);

  // Score Ranking
  if (total && Object.keys(total).length > 0) {
    let keysSorted = Object.keys(total).sort(function (a, b) {
      return total[b] - total[a]
    });

    for (let i = 0; i < keysSorted.length && i < 5; i++) {
      log.p('Top', i + 1, '=', keysSorted[i], '=>', total[keysSorted[i]]);
    }

    //If we found at least one intent
    if (keysSorted && keysSorted[0]){
      let maxIndex = keysSorted[0]; 
      let maxScore= total[maxIndex];
      log.f("MaxScore:"+ maxScore);
      if (isNaN(maxScore) || maxScore <= -50){
        //Enter fallback intent
        return null;
      }else{
        //Return max intent.
        intents[maxIndex].score = maxScore;
        return intents[maxIndex];
      }
    }else{
      //Enter fallback intent
      return null;
    }
  }

  //Default response;
  return null;
};
