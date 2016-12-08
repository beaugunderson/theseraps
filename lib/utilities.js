'use strict';

var rhymePlus = require('rhyme-plus-plus');
var sentenceTools = require('sentence-tools');
var _ = require('lodash');

exports.clean = function clean(line) {
  line = sentenceTools.trim(line);
  line = sentenceTools.normalizeWhitespace(line);
  line = sentenceTools.normalizeQuotes(line);
  line = sentenceTools.compress(line);
  line = line.replace(/\.$/, '');

  return line;
};

// Returns the word minus any punctuation and with in' → ing
function cleanWord(word) {
  return word
    .replace(/[^a-zA-Z']/g, '')
    .replace(/in'$/, 'ing');
}

function lastWord(line) {
  return cleanWord(sentenceTools.lastWord(line));
}

exports.linesRhyme = function (rhyme, line1, line2) {
  return rhyme.doesLastGroupRhyme(lastWord(line1), lastWord(line2));
};

function activeMinusNumbers(rhyme, word) {
  return rhymePlus.active(rhyme.pronounce(word)[0])
    .split(' ')
    .map(function (phoneme) {
      return phoneme.replace(/[0-9]+$/g, '');
    });
}

function syllables(rhyme, line) {
  return _.sum(sentenceTools.words(line).map(function (word) {
    return rhyme.syllables(word) || word.length / 5;
  }));
}

exports.rhymeScore = function (rhyme, lines) {
  var p1 = activeMinusNumbers(rhyme, lastWord(lines[0]));
  var p2 = activeMinusNumbers(rhyme, lastWord(lines[1]));

  return _.intersection(p1, p2).length / Math.max(p1.length, p2.length);
};

exports.syllableScore = function (rhyme, lines) {
  var s1 = syllables(rhyme, lines[0]);
  var s2 = syllables(rhyme, lines[1]);

  return Math.min(s1, s2) / Math.max(s1, s2);
};
