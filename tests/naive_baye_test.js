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
Intent Classification Engine - Test
Naive Bayes
https://en.wikipedia.org/wiki/Naive_Bayes_classifier
*/

const wordcut = require("wordcut");
const fs = require("fs");
const Log = require("../utils/log.ts");
wordcut.init();
const naive_baye = require("../intent-classifiers/naive_baye");
let csv = require('csv-parser');
let log = new Log("naive_baye_test");
log.enable = true;

const train_bot = [];
const train_usersays = {};
const test_bot = [];
const test_usersays = {};

fs.createReadStream('mari_train.csv')
  .pipe(csv())
  .on('data', (data) => {
    if (!train_usersays[data.destination]){
        train_usersays[data.destination] = [];
    }
    train_usersays[data.destination].push(data.texts);
  })
  .on('end', () => {
    let count = 0;
    for (intentName in train_usersays){
        train_bot.push({
            index: count++,
            name: intentName,
            usersays: train_usersays[intentName]
        })
    }
    
    fs.createReadStream('mari_test.csv')
    .pipe(csv())
    .on('data', (data) => {
        if (!data.destination){
            data.destination = "null";
        }
        if (!test_usersays[data.destination]){
            test_usersays[data.destination] = [];
        }
        test_usersays[data.destination].push(data.texts);
    })
    .on('end', () => {
        let correct = 0;
        let incorrect = 0;
        log.p(test_usersays);
        for (label in test_usersays){
            log.p("====="+label+"======");
            for (usersays in test_usersays[label]){
                let ret = naive_baye(null, test_usersays[label][usersays], train_bot);
                if (!ret){
                    ret = {name: "null"};
                }
                log.p(test_usersays[label][usersays]+"\t"+ret.name+"\t"+label);
                if (ret && ret.name == label){
                    correct++;
                }else{
                    incorrect++;
                }
                log.p("Accuracy:" + (correct+"/"+(correct+incorrect)));
                log.p("-----");
            }
        }
        // Action
        // Experiment 1: 2743/3236 = 84%    score[i] += Math.log(((found * nk) / (qscore))+0.00000000001);
        // Experiment 2: 2759/3236 = 85.25%    Remove Unigram and score[i] += Math.log(((found_in_class * nk) / (found_in_all))+0.0000000000000000000001);
        // Experiment 3: 2770/3236 = 85.59%    Remove Unigram and score[i] += Math.log(((found_in_class * nk * nk) / (found_in_all))+0.0000000000000000000001);
        
        // Destination
        // Experiment 4: 2340/3236 = 72.31%  (Destination)
        // Experiment 5: 2270/3236 = 70.14% 
        // let current_score = Math.log(((found_in_class * nk * nk) / (found_in_all))+0.0000000000000000000001);
        //         if (current_score > score[i]){
        //           score[i] = current_score
        //         } 
        // Experiment 6: 2337/3236 = 72.31% Using score[i] += Math.log(((found_in_class * nk) / (found_in_all))+0.0000000000000000000001);
        // Experiment 7: 2348/3236 = 72.50% Average Score and score[i].push(Math.log10(((found_in_class*nk*nk)+1e-100)/found_in_all)); and      if (isNaN(maxScore) || maxScore <= -50){
        // Experiment 8: 2270/3236 = 70.14% Max Score score[i].push(Math.log10(((found_in_class*nk*nk)+1e-100)/found_in_all)); and      if (isNaN(maxScore) || maxScore <= -50){

    });
});



