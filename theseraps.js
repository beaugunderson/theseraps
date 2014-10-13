'use strict';

var botUtilities = require('bot-utilities');
var getCandidates = require('./lib/candidates.js');
var Twit = require('twit');
var _ = require('lodash');

_.mixin(botUtilities.lodashMixins);

var program = require('commander');

function makeTweet(rap, news) {
  return '🎶 ' + rap + '\n📰 ' + news;
}

program
  .command('tweet')
  .description('Generate and tweet a rap/news mashup')
  .option('-r, --random', 'only post a percentage of the time')
  .action(function (options) {
    if (options.random) {
      if (_.percentChance(98)) {
        console.log('Skipping...');

        process.exit(0);
      }
    }

    var T = new Twit(botUtilities.getTwitterAuthFromEnv());

    getCandidates(function (candidates) {
      var choice;

      if (_.random(0, 100) < 50) {
        console.log('Choosing an exact match');

        choice = _(candidates)
          .filter({score: 1})
          .sample().lines;
      } else {
        console.log('Choosing an inexact match');

        choice = _(candidates)
          .filter(function (candidate) {
            return candidate.score < 1;
          })
          .sample().lines;
      }

      var tweet = makeTweet(choice[0], choice[1]);

      console.log(tweet);

      T.post('statuses/update', {status: tweet},
          function (err, data, response) {
        if (err || response.statusCode !== 200) {
          console.log('Error sending tweet', err, response.statusCode);

          return;
        }
      });

      console.log('Done.');
    });
  });

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
