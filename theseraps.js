'use strict';

var async = require('async');
var botUtilities = require('bot-utilities');
var getCandidates = require('./lib/candidates.js');
var Twit = require('twit');
var ValueCache = require('level-cache-tools').ValueCache;
var _ = require('lodash');

_.mixin(botUtilities.lodashMixins);

var usedLines = new ValueCache('used-lines');

var program = require('commander');

function makeTweet(rap, news) {
  return '🎶 ' + rap + '\n📰 ' + news;
}

program
  .command('tweet')
  .description('Generate and tweet a rap/news mashup')
  .option('-r, --random', 'only post a percentage of the time')
  .action(botUtilities.randomCommand(function () {
    var T = new Twit(botUtilities.getTwitterAuthFromEnv());

    getCandidates(function (candidates) {
      function pick() {
        if (_.random(0, 100) < 50) {
          console.log('Choosing an exact match');

          return _(candidates)
            .filter({score: 1})
            .sample().lines;
        }

        console.log('Choosing an inexact match');

        return _(candidates)
          .filter(function (candidate) {
            return candidate.score < 1;
          })
          .sample().lines;
      }

      var choice;

      async.whilst(function () {
        console.log('Choosing...');

        choice = pick();
      }, function (cbWhilst) {
        async.some(choice, usedLines.used, cbWhilst);
      }, function (err) {
        if (err) {
          throw err;
        }

        usedLines.putMulti(choice, function (err) {
          if (err) {
            throw err;
          }

          var tweet = makeTweet(choice[0], choice[1]);

          console.log(tweet);

          T.post('statuses/update', {status: tweet},
              function (err, data, response) {
            if (err || response.statusCode !== 200) {
              console.log('Error sending tweet', err, response.statusCode);

              return;
            }

            console.log('Done.');
          });
        });
      });
    });
  }));

program
  .command('candidates')
  .description('Get and print some candidates')
  .action(function () {
    getCandidates(function (candidates) {
      candidates.forEach(function (candidate) {
        console.log(makeTweet(candidate.lines[0], candidate.lines[1]));
        console.log('---');
      });
    });
  });

program.parse(process.argv);
