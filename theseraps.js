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

function makeTweet(order, lines) {
  var news;
  var rap;

  if (order === 0) {
    rap = '🎶 ' + lines[0];
    news = '📰 ' + lines[1];

    return [rap, news].join('\n');
  }

  rap = '🎶 ' + lines[1];
  news = '📰 ' + lines[0];

  return [news, rap].join('\n');
}

function filter(candidates) {
  console.log('got %d candidates', candidates.length);

  candidates = candidates.filter(function (candidate) {
    return candidate.syllableScore >= 0.7;
  });

  console.log('sorting %d candidates with good syllable score',
    candidates.length);

  candidates = _.sortBy(candidates, function (candidate) {
    return -((candidate.syllableScore + candidate.rhymeScore) / 2);
  });

  if (candidates.length >= 4) {
    candidates = _.take(candidates, Math.round(candidates.length * 0.25));
  }

  console.log('filtered to top %d candidates', candidates.length);

  return candidates;
}

program
  .command('tweet')
  .description('Generate and tweet a rap/news mashup')
  .option('-r, --random', 'only post a percentage of the time')
  .action(botUtilities.randomCommand(function () {
    var T = new Twit(botUtilities.getTwitterAuthFromEnv());

    getCandidates(function (err, candidates) {
      if (err) {
        throw err;
      }

      candidates = filter(candidates);

      function pick() {
        if (_.random(0, 100) < 50) {
          console.log('choosing an exact match');

          return _(candidates)
            .filter({rhymeScore: 1})
            .sample();
        }

        console.log('choosing an inexact match');

        return _(candidates)
          .filter(function (candidate) {
            return candidate.rhymeScore < 1;
          })
          .sample();
      }

      var choice;

      async.whilst(function () {
        console.log('choosing...');

        choice = pick();
      }, function (cbWhilst) {
        async.some(choice.lines, usedLines.used, cbWhilst);
      }, function (err) {
        if (err) {
          throw err;
        }

        usedLines.putMulti(choice.lines, function (err) {
          if (err) {
            throw err;
          }

          var tweet = makeTweet(choice.order, choice.lines);

          console.log('score: %d, %d',
            choice.syllableScore,
            choice.rhymeScore,
            (choice.syllableScore + choice.rhymeScore) / 2);

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
      candidates = filter(candidates);

      candidates.forEach(function (candidate) {
        console.log('score: syllable: %d, rhyme: %d',
          candidate.syllableScore,
          candidate.rhymeScore,
          (candidate.syllableScore + candidate.rhymeScore) / 2);
        console.log(makeTweet(candidate.order, candidate.lines));
        console.log('---');
      });
    });
  });

program.parse(process.argv);
