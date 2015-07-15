'use strict';

var rhymePlus = require('rhyme-plus');
var sentenceTools = require('sentence-tools');
var _ = require('lodash');

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

exports.lineScore = function (rhyme, line1, line2) {
  var p1 = rhymePlus.active(rhyme.pronounce(lastWord(line1))[0]).split(' ');
  var p2 = rhymePlus.active(rhyme.pronounce(lastWord(line2))[0]).split(' ');

  return _.intersection(p1, p2).length / Math.max(p1.length, p2.length);
};
