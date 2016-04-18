'use strict';

var news = require('./news.js');
var path = require('path');
var quoteTools = require('quote-tools');
var rapLines = require('./raps.js');
var Rhyme = require('rhyme-plus').Rhyme;
var sentenceTools = require('sentence-tools');
var utilities = require('./utilities.js');
var _ = require('lodash');

function highWordCountDifference(a, b) {
  return Math.abs(sentenceTools.countWords(a) -
                  sentenceTools.countWords(b)) > 5;
}

function evenDoubleQuotes(candidate) {
  // Keep lines with even double quotes
  return quoteTools.evenDoubleQuotes(candidate.lines[0]) &&
         quoteTools.evenDoubleQuotes(candidate.lines[1]);
}

function stripDoubleQuotes(candidate) {
  if ((candidate.match(/"/g) || []).length === 2 &&
      candidate[0] === '"' &&
      candidate[candidate.length - 1] === '"') {
    return candidate.replace(/"/g, '');
  }

  return candidate;
}

function stripCandidateDoubleQuotes(candidate) {
  candidate.lines[0] = stripDoubleQuotes(candidate.lines[0]);
  candidate.lines[1] = stripDoubleQuotes(candidate.lines[1]);

  return candidate;
}

function candidateTooLong(candidate) {
  // Discard rhymes that are too long
  return candidate.lines[0].length +
         candidate.lines[1].length + 5 > 140;
}

module.exports = function getCandidates(cb) {
  var raps = rapLines.load();
  var rhyme = new Rhyme();

  console.log('Loading rhyme dictionary...');

  // TODO: Move to async.seq?
  rhyme.load(function () {
    function linesRhyme(a, b) {
      return utilities.linesRhyme(rhyme, a, b);
    }

    news.getSentences(function (err, sentences) {
      if (err) {
        return cb(err);
      }

      console.log('Finding rhymes...');

      function processRapLinePair(lines) {
        var order = _.sample([0, 1]);

        var highWordCountDifferenceInSentenceAndLine =
          _.partial(highWordCountDifference, lines[order]);

        var lineAndSentenceRhymes = _.partial(linesRhyme, lines[order]);

        function processSentence(sentence) {
          var orderedLines;

          if (order === 0) {
            orderedLines = [lines[0], sentence];
          } else {
            orderedLines = [sentence, lines[1]];
          }

          return {
            lines: orderedLines,
            order: order,
            rhymeScore: utilities.rhymeScore(rhyme, orderedLines),
            syllableScore: utilities.syllableScore(rhyme, orderedLines)
          };
        }

        return sentences
          .reject(highWordCountDifferenceInSentenceAndLine)
          .filter(lineAndSentenceRhymes)
          .map(processSentence)
          .value();
      }

      var candidates = _(raps)
        .map(processRapLinePair)
        .flatten()
        .filter(evenDoubleQuotes)
        .map(stripCandidateDoubleQuotes)
        .reject(candidateTooLong)
        .sortBy(['syllableScore', 'rhymeScore'])
        .value();

      cb(candidates);
    });
  }, path.resolve(__dirname, '../data/cmudict.0.7a'));
};
