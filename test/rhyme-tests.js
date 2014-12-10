'use strict';

var path = require('path');
var rhymePlus = require('rhyme-plus');

var utilities = require('../lib/utilities.js');

rhymePlus.loadData(function (r) {
  console.log('doRhyme');

  console.log('bed', 'red', r.doRhyme('bed', 'red'));
  console.log('bed', 'instead', r.doRhyme('bed', 'instead'));

  console.log('doRhymeSloppy');

  console.log('bed', 'red', r.doRhymeSloppy('bed', 'red'));
  console.log('bed', 'instead', r.doRhymeSloppy('bed', 'instead'));
  console.log('bed', 'behead', r.doRhymeSloppy('bed', 'behead'));
  console.log('bed', 'hard', r.doRhymeSloppy('bed', 'hard'));

  console.log(r.pronounce('rental'));
  console.log(r.pronounce('temple'));

  console.log(r.pronounce('frauds'));
  console.log(r.pronounce('pause'));

  console.log(r.pronounce('heaven')[0]);
  console.log(r.pronounce('cremation')[0]);

  console.log(rhymePlus.activeSloppy(r.pronounce('heaven')[0], 1));
  console.log(rhymePlus.activeSloppy(r.pronounce('cremation')[0], 1));

  console.log(utilities.lineScore(r, 'i like beef', 'i am a thief'));
}, path.resolve(__dirname, '../data/cmudict.0.7a'));
