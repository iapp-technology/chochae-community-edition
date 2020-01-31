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

/*
Intent Classification Engine
Naive Bayes
https://en.wikipedia.org/wiki/Naive_Bayes_classifier
*/

import wordcut from 'wordcut';
wordcut.init();
import Log from '../../utils/log';
import { Bot, Intent } from '../../types';
const log = new Log('naiveBaye.ts');
log.enable = false;

const EPSILON = 1e-100;
const FALLBACK_THRESHOLD = -50;
const DEBUG_TOP_N = 5;

export default class NaiveBaye {
  intents: Intent[];
  bot: Bot;
  concat: object = {};
  all: string = '';

  constructor(intents: Intent[], bot?: Bot) {
    this.intents = intents;
    this.bot = bot;

    // Processing text query
    for (const i in intents) {
      if (intents.hasOwnProperty(i)) {
        this.concat[i] =
          intents[i]
            .usersays!.join('|')
            .replace(/[&\/\\#,+()$~%'":*?<>{}0-9]/g, '') + '|';
        this.all += this.concat[i];
      }
    }
    log.debug('All:', this.all);
    log.debug('Concat:', this.concat);
  }

  classify(sender: string, text: string) {
    /**
     * Check Exact Match
     */
    text = text && text.trim().toLowerCase();

    log.d(text);

    for (const i in this.intents) {
      if (this.intents.hasOwnProperty(i)) {
        for (const l in this.intents[i].usersays) {
          if (this.intents[i]!.usersays!.hasOwnProperty(l)) {
            const t = this.intents[i]!.usersays![l].trim().toLowerCase();
            if (t === text) {
              this.intents[i].score = 1.0;
              return this.intents[i];
            }
          }
        }
      }
    }

    /**
     * Check Naive Baye
     */
    const score = {};

    // ta = term array
    const ta = wordcut
      .cut(text.replace(/[&\/\\#,+()$~%'":*?<>{}]/g, ''))
      .split('|');

    log.debug('ta (term-array):', ta);

    // Clear stopwords;
    // ta = _.difference(ta, stopwords);
    // log.debug("ta (after clean stopwords):",ta);

    for (const i in this.intents) {
      if (this.intents.hasOwnProperty(i)) {
        score[i] = [];
      }
    }

    // Generate n-gram sequence from 1-gram to 6-gram
    const seq = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };

    for (const l in seq) {
      if (seq.hasOwnProperty(l)) {
        const nl = parseInt(l, 10);
        for (let i = 0; i < ta.length - (nl - 1); i++) {
          let tmp = '';
          for (let j = 0; j < nl; j++) {
            tmp += ta[i + j];
          }
          seq[l].push(tmp);
        }
      }
    }

    log.p('Input:', ta);
    log.p('Seq:', seq);

    for (const k in seq) {
      if (seq.hasOwnProperty(k)) {
        const nk = parseInt(k, 10);
        log.p('--' + nk + '--');
        for (const i in this.intents) {
          if (this.intents.hasOwnProperty(i)) {
            for (let l = 0; l < seq[k].length; l++) {
              const q = seq[k][l].trim();
              log.p(q);
              if (q.length > 0) {
                try {
                  const foundInClass = (
                    this.concat[i].match(new RegExp(q, 'g')) || []
                  ).length;
                  const foundInAll = (this.all.match(new RegExp(q, 'g')) || [])
                    .length;
                  log.p(
                    'Query:',
                    q,
                    'Found in Class:',
                    foundInClass,
                    'Found in All:',
                    foundInAll,
                  );
                  if (foundInAll > 0) {
                    score[i].push(
                      Math.log10(
                        (foundInClass * nk * nk + EPSILON) / foundInAll,
                      ),
                    );
                  }
                } catch (e) {
                  log.f('Exception:', e);
                }
              }
            }
          }
        }
      }
    }

    log.f('Score:', score);

    const total = {};
    for (const i in score) {
      if (score.hasOwnProperty(i)) {
        if (!total[i]) {
          total[i] = 0;
        }
        for (const l in score[i]) {
          if (score[i].hasOwnProperty(l)) {
            total[i] += score[i][l];
          }
        }
        total[i] = (1.0 * total[i]) / score[i].length;
      }
    }

    log.f('Total:', total);

    // Score Ranking
    if (total && Object.keys(total).length > 0) {
      const keysSorted = Object.keys(total).sort((a, b) => total[b] - total[a]);

      for (let i = 0; i < keysSorted.length && i < DEBUG_TOP_N; i++) {
        log.p('Top', i + 1, '=', keysSorted[i], '=>', total[keysSorted[i]]);
      }

      // If we found at least one intent
      if (keysSorted && keysSorted[0]) {
        const maxIndex = keysSorted[0];
        const maxScore = total[maxIndex];
        log.f('MaxScore:' + maxScore);
        if (isNaN(maxScore) || maxScore < FALLBACK_THRESHOLD) {
          // Enter fallback intent
          return null;
        }
        // Return max intent.
        this.intents[maxIndex].score = maxScore;
        return this.intents[maxIndex];
      }
      // Enter fallback intent
      return null;
    }

    // Default response;
    return null;
  }
}
