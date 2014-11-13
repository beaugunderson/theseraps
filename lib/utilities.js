'use strict';

var rhymePlus = require('rhyme-plus');
var _ = require('lodash');

var cleanLine = exports.cleanLine = function (line) {
  return line.split(/\s+/);
};

// Returns the word minus any punctuation and with in' → ing
var cleanWord = exports.cleanWord = function (word) {
  return word
    .replace(/[^a-zA-Z']/g, '')
    .replace(/in'$/, 'ing');
};

exports.count = function (sentence) {
  return cleanLine(sentence).length;
};

exports.linesRhyme = function (rhyme, line1, line2, optionalFuzz) {
  if (!optionalFuzz) {
    optionalFuzz = 0;
  }

  var split1 = cleanLine(line1);
  var split2 = cleanLine(line2);

  var word1 = cleanWord(split1.pop());
  var word2 = cleanWord(split2.pop());

  return rhyme.doRhymeSloppy(word1, word2, optionalFuzz);
};

exports.lineScore = function (rhyme, line1, line2) {
  var split1 = cleanLine(line1);
  var split2 = cleanLine(line2);

  var word1 = cleanWord(split1.pop());
  var word2 = cleanWord(split2.pop());

  var p1 = rhymePlus.active(rhyme.pronounce(word1)[0]).split(' ');
  var p2 = rhymePlus.active(rhyme.pronounce(word2)[0]).split(' ');

  var score = _.intersection(p1, p2).length / Math.max(p1.length, p2.length);

  return score;
};
