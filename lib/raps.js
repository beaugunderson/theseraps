'use strict';

var fs = require('fs');
var utilities = require('./utilities.js');
var wordfilter = require('wordfilter');
var _ = require('lodash');

wordfilter.addWords([
  'autopsy',
  'blood',
  'dead',
  'dying',
  'gun',
  'hoe',
  'homicide',
  'injur',
  'kill',
  'lame',
  'lennon',
  'my strap',
  'nigg',
  'spanish fly',
  'wig'
]);

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
    .shuffle()
    .take(500)
    .value();
};
