'use strict';

var rhymePlus = require('rhyme-plus');
var _ = require('lodash');

// Returns the word minus any punctuation and with in' → ing
function cleanWord(word) {
  return word
    .replace(/[^a-zA-Z']/g, '')
    .replace(/in'$/, 'ing');
}

exports.linesRhyme = function (rhyme, line1, line2, optionalFuzz) {
  if (!optionalFuzz) {
    optionalFuzz = 0;
  }

  var word1 = cleanWord(line1.split(/\s+/).pop());
  var word2 = cleanWord(line2.split(/\s+/).pop());

  return rhyme.doRhymeSloppy(word1, word2, optionalFuzz);
};

exports.lineScore = function (rhyme, line1, line2) {
  var word1 = cleanWord(line1.split(/\s+/).pop());
  var word2 = cleanWord(line2.split(/\s+/).pop());

  var p1 = rhymePlus.active(rhyme.pronounce(word1)[0]).split(' ');
  var p2 = rhymePlus.active(rhyme.pronounce(word2)[0]).split(' ');

  var score = _.intersection(p1, p2).length / Math.max(p1.length, p2.length);

  return score;
};
