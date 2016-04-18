'use strict';

var newsText = require('news-text');
var sentenceTools = require('sentence-tools');
var utilities = require('./utilities.js');
var _ = require('lodash');

var googleNews = new newsText.GoogleNews();

exports.getSentences = function (cb) {
  console.log('Loading Google News...');

  var sentences;

  if (process.env.OFFLINE) {
    sentences = _(require('../offline-sentences.json'))
      .map(utilities.clean)
      .map(sentenceTools.stripTrailingPeriod);

    cb(null, sentences);

    return;
  }

  googleNews.topArticles(function (err, articles) {
    if (err) {
      return cb(err);
    }

    console.log('→ article lengths', _.map(articles, 'length'));

    console.log('Getting sentences...');

    sentences = _(articles)
      .map(sentenceTools.tokenize)
      .flatten(sentences)
      .filter(function (sentence) {
        var words = sentenceTools.countWords(sentence);

        // We want sentences of 5 to 15 words
        return words >= 5 && words <= 15;
      })
      .map(utilities.clean)
      .map(sentenceTools.stripTrailingPeriod);

    console.log('→ got', sentences.value().length, 'sentences');

    cb(null, sentences);
  });
};
