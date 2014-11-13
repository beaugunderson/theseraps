'use strict';

var async = require('async');
var fs = require('fs');
var newsText = require('news-text');
var path = require('path');
var request = require('request');
var rhymePlus = require('rhyme-plus');
var wordfilter = require('wordfilter');
var _ = require('lodash');

wordfilter.addWords(['nigg']);

var utilities = require('./utilities.js');

var googleNews = new newsText.GoogleNews();

function isBlacklisted(rap) {
  return wordfilter.blacklisted(rap[0]) || wordfilter.blacklisted(rap[1]);
}

module.exports = function getCandidates(cb) {
  console.log('Loading rap lines...');

  var raps = _(fs.readFileSync('./data/rhyming-lines.json', 'utf8').split('\n'))
    .compact()
    .map(JSON.parse)
    .reject(isBlacklisted)
    .valueOf();

  console.log('Loading rhyme dictionary...');

  rhymePlus.loadData(function (rhyme) {
    console.log('Loading Google News...');

    // TODO: Move to async.seq?
    googleNews.topArticles(function (err, articles) {
      if (err) {
        throw err;
      }

      console.log('→ article lengths', _.pluck(articles, 'length'));

      console.log('Getting sentences...');

      async.map(articles, function (article, cbMapArticles) {
        // This is a local version of http://sentences.in/
        request.post({
          url: 'http://127.0.0.1:9999',
          body: article,
          json: true
        }, function (ignoredError, res, body) {
          if (!body) {
            body = {sentences: []};
          }

          cbMapArticles(null, body.sentences);
        });
      },
      function (ignoredError, sentences) {
        sentences = _.flatten(sentences).filter(function (sentence) {
          var split = sentence.split(/\s+/);

          return split.length >= 5 && split.length <= 15;
        });

        console.log('→ got', sentences.length, 'sentences');
        console.log('Finding rhymes...');

        var candidates = [];
        var lineSets = _.sample(raps, 1000);

        lineSets.forEach(function (lines) {
          sentences.forEach(function (sentence) {
            if (Math.abs(utilities.count(sentence) -
                         utilities.count(lines[1])) > 5) {
              return;
            }

            if (utilities.linesRhyme(rhyme, lines[0], sentence, 1)) {
              candidates.push({
                lines: [
                  // TODO: Move this first one to process.js
                  lines[0].replace(/\s+/g, ' '),
                  sentence.replace(/\s+/g, ' ')
                ],
                score: utilities.lineScore(rhyme, lines[0], sentence)
              });
            }
          });
        });

        console.log('Sorting and rejecting...');

        candidates = _(candidates)
          .reject(function (candidate) {
            var quotes = candidate.lines[1].match(/"/g);

            // Discard lines with mis-matched quotes
            if (quotes && quotes.length % 2 !== 0) {
              return true;
            }

            // Discard rhymes where less than half of the phonemes match
            return candidate.score < 0.5;
          })
          .sortBy('score')
          .valueOf();

        cb(candidates);
      });
    });
  }, (path.resolve(__dirname, '../data/cmudict.0.7a')));
};
