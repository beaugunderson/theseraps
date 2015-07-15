'use strict';

var cheerio = require('cheerio');
var fs = require('fs');
var globStream = require('glob-stream');
var map = require('through2-map');
var path = require('path');
var Rhyme = require('rhyme-plus').Rhyme;
var spy = require('through2-spy');
var through2 = require('through2');

var utilities = require('./lib/utilities.js');

var globbed = 0;
var fileRead = 0;
var fileDone = 0;

var getLyrics = map.obj(function (song) {
  var $ = cheerio.load(song.contents);

  return {lines: $('pre').text().split('\n')};
});

var removeBadLines = map.obj(function (song) {
  var lines = song.lines;

  lines = lines.filter(function (line) {
    line = line.replace(/-=.*?=-/g, '');
    line = line.replace(/\bx\d{1,2}\b/g, '');

    var trimmed = line.trim();

    return trimmed !== '' &&
           trimmed !== '* send corrections to the typist' &&
           !trimmed.match(/^\[.*\]$/) &&
           !trimmed.match(/^(artist|album|song|typed by):/i);
  });

  return {lines: lines};
});

var removeShortLines = map.obj(function (song) {
  var longLines = song.rhymingLines.filter(function (rhymingLines) {
    return utilities.cleanLine(rhymingLines[0]).length >= 5 &&
           utilities.cleanLine(rhymingLines[1]).length >= 5;
  });

  return {rhymingLines: longLines};
});

var flatten = through2.obj(function (song, enc, cb) {
  var self = this;

  song.rhymingLines.forEach(function (rhymingLines) {
    self.push(rhymingLines);
  });

  cb();
});

var toJsonString = through2.obj(function (lines, enc, cb) {
  cb(null, JSON.stringify(lines) + '\n');
});

var rhyme = new Rhyme();

rhyme.load(function () {
  var getRhymingLines = map.obj(function (song) {
    var rhymingLines = [];

    for (var i = 0; i < song.lines.length - 1; i++) {
      var line1 = song.lines[i];
      var line2 = song.lines[i + 1];

      if (utilities.linesRhyme(rhyme, line1, line2)) {
        rhymingLines.push([line1, line2]);
      }
    }

    return {rhymingLines: rhymingLines};
  });

  globStream.create('**/*.txt')
    .pipe(spy.obj(function () {
      if (globbed++ % 100 === 0) {
        process.stdout.write('.');
      }
    }))
    .pipe(through2.obj(function (chunk, enc, cb) {
      fs.readFile(chunk.path, 'utf8', function (err, contents) {
        cb(err, {contents: contents});
      });
    }))
    .pipe(spy.obj(function () {
      if (fileRead++ % 100 === 0) {
        process.stdout.write('+');
      }
    }))
    .pipe(getLyrics)
    .pipe(removeBadLines)
    .pipe(getRhymingLines)
    .pipe(removeShortLines)
    .pipe(spy.obj(function () {
      if (fileDone++ % 100 === 0) {
        process.stdout.write('!');
      }
    }))
    .pipe(flatten)
    .pipe(toJsonString)
    .pipe(fs.createWriteStream('./rhyming-lines.json'));
}, (path.join(__dirname, 'data/cmudict.0.7a')));
