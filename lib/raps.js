'use strict';

var fs = require('fs');
var utilities = require('./utilities.js');
var wordfilter = require('wordfilter');
var _ = require('lodash');

wordfilter.addWords(['nigg']);

function isFiltered(line) {
  return wordfilter.blacklisted(line);
}

exports.load = function () {
  console.log('Loading rap lines...');

  return _(fs.readFileSync('./data/rhyming-lines.json', 'utf8').split('\n'))
    .compact()
    .map(JSON.parse)
    // Each object is a set of two lines
    .map(function (lines) {
      return lines.map(utilities.clean);
    })
    .reject(function (lines) {
      return lines.some(isFiltered);
    })
    // TODO: Also reject lines with widely mismatched syllable counts?
    .shuffle()
    .take(500)
    .value();
};
