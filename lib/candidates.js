'use strict';

var fs = require('fs');
var newsText = require('news-text');
var path = require('path');
var rhymePlus = require('rhyme-plus');
var quoteTools = require('quote-tools');
var sentenceTools = require('sentence-tools');
var utilities = require('./utilities.js');
var wordfilter = require('wordfilter');
var _ = require('lodash');

wordfilter.addWords(['nigg']);

var googleNews = new newsText.GoogleNews();

function isFiltered(line) {
  return wordfilter.blacklisted(line);
}

function clean(line) {
  line = sentenceTools.trim(line);
  line = sentenceTools.normalizeWhitespace(line);
  line = sentenceTools.normalizeQuotes(line);
  line = sentenceTools.compress(line);

  return line;
}

module.exports = function getCandidates(cb) {
  console.log('Loading rap lines...');

  var raps = _(fs.readFileSync('./data/rhyming-lines.json', 'utf8').split('\n'))
    .compact()
    .map(JSON.parse)
    // Each object is a set of two lines
    .map(function (lines) {
      return lines.map(clean);
    })
    .reject(function (lines) {
      return lines.some(isFiltered);
    })
    // TODO: Also reject lines with widely mismatched syllable counts?
    .shuffle()
    .take(1000)
    .value();

  console.log('Loading rhyme dictionary...');

  // TODO: Move to async.seq?
  rhymePlus.loadData(function (rhyme) {
    console.log('Loading Google News...');

    googleNews.topArticles(function (err, articles) {
      if (err) {
        throw err;
      }

      console.log('→ article lengths', _.pluck(articles, 'length'));

      console.log('Getting sentences...');

      var sentences = _(articles)
        .map(sentenceTools.tokenize)
        .flatten(sentences)
        .filter(function (sentence) {
          var words = sentenceTools.countWords(sentence);

          // We want sentences of 5 to 15 words
          return words >= 5 && words <= 15;
        })
        .map(clean)
        .map(sentenceTools.stripTrailingPeriod);

      console.log('→ got', sentences.value().length, 'sentences');
      console.log('Finding rhymes...');

      function highWordCountDifference(a, b) {
        return Math.abs(sentenceTools.countWords(a) -
                        sentenceTools.countWords(b)) > 5;
      }

      function linesRhyme(a, b) {
        return utilities.linesRhyme(rhyme, a, b, 1);
      }

      var candidates = _(raps)
        .map(function (lines) {
          var highWordCountDifferenceInSentenceAndSecondLine =
            _.partial(highWordCountDifference, lines[1]);
          var firstLineAndSentenceRhymes = _.partial(linesRhyme, lines[0]);

          return sentences
            .filter(firstLineAndSentenceRhymes)
            .reject(highWordCountDifferenceInSentenceAndSecondLine)
            .map(function (sentence) {
              return {
                lines: [lines[0], sentence],
                score: utilities.lineScore(rhyme, lines[0], sentence)
              };
            })
            .value();
        })
        .flatten()
        .filter(function (candidate) {
          // Keep lines with even double quotes
          return quoteTools.evenDoubleQuotes(candidate.lines[1]);
        })
        .reject(function (candidate) {
          // Discard rhymes where less than half of the phonemes match
          return candidate.score < 0.5;
        })
        .sortBy('score')
        .value();

      cb(candidates);
    });
  }, (path.resolve(__dirname, '../data/cmudict.0.7a')));
};
