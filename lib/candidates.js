'use strict';

var async = require('async');
var Diffbot = require('diffbot').Diffbot;
var fs = require('fs');
var htmlParser = require('htmlparser2');
var path = require('path');
var request = require('request');
var rhymePlus = require('rhyme-plus');
var _ = require('lodash');

var utilities = require('./utilities.js');

var GOOGLE_URL = 'https://news.google.com/news/feeds?pz=1&cf=all&ned=us&hl=en&output=atom';

module.exports = function getCandidates(cb) {
  var diffbot = new Diffbot(process.env.DIFFBOT_TOKEN);

  console.log('Loading rap lines...');

  var raps = _(fs.readFileSync('./data/rhyming-lines.json', 'utf8').split('\n'))
    .map(function (rap) {
      if (rap) {
        return JSON.parse(rap);
      }
    })
    .reject(function (rap) {
      if (!rap) {
        return true;
      }

      return (rap[0] + rap[1])
        .match(/\b(hoe|ho\b|dick|fag|nigg|niga|bitch|pussy)/i);
    })
    .valueOf();

  console.log('Loading rhyme dictionary...');

  rhymePlus.loadData(function (rhyme) {
    console.log('Loading Google News...');

    request(GOOGLE_URL, function (err, response, body) {
      if (err || response.statusCode !== 200) {
        throw err;
      }

      var dom = htmlParser.parseFeed(body);
      var links = [];

      dom.items.forEach(function (item) {
        // XXX: Wish I did't have to decode html entities myself
        links.push(item.link.replace(/&amp;/g, '&'));
      });

      console.log('→ got', links.length, 'stories');

      console.log('Getting Diffbot output...');

      async.map(links, function (link, cbMapLinks) {
        diffbot.article({uri: link}, function (err, res) {
          if (!res.text) {
            res.text = '';
          }

          var article = res.text
            .replace(/’’/g, '"')
            .replace(/“|”|„|‟/g, '"')
            .replace(/‘|’|‛/g, "'");

          cbMapLinks(err, article);
        });
      },
      function (err, articles) {
        if (err) {
          throw err;
        }

        console.log('→ article lengths', articles.map(function (article) {
          return article.length;
        }));

        console.log('Getting sentences...');

        async.map(articles, function (article, cbMapArticles) {
          // This is a local version of http://sentences.in/
          request.post({
            url: 'http://127.0.0.1:9999',
            body: article,
            json: true
          }, function (ignoredError, res, body) {
            if (!body) {
              body = {sentences: []};
            }

            cbMapArticles(null, body.sentences);
          });
        },
        function (ignoredError, sentences) {
          sentences = _.flatten(sentences).filter(function (sentence) {
            var split = sentence.split(/\s+/);

            return split.length >= 5 && split.length <= 15;
          });

          console.log('→ got', sentences.length, 'sentences');
          console.log('Finding rhymes...');

          var candidates = [];
          var lineSets = _.sample(raps, 1000);

          lineSets.forEach(function (lines) {
            sentences.forEach(function (sentence) {
              if (Math.abs(utilities.count(sentence) -
                           utilities.count(lines[1])) > 5) {
                return;
              }

              if (utilities.linesRhyme(rhyme, lines[0], sentence, 1)) {
                candidates.push({
                  lines: [
                    // TODO: Move this first one to process.js
                    lines[0].replace(/\s+/g, ' '),
                    sentence.replace(/\s+/g, ' ')
                  ],
                  score: utilities.lineScore(rhyme, lines[0], sentence)
                });
              }
            });
          });

          console.log('Sorting and rejecting...');

          candidates = _(candidates)
            .reject(function (candidate) {
              var quotes = candidate.lines[1].match(/"/g);

              // Discard lines with mis-matched quotes
              if (quotes && quotes.length % 2 !== 0) {
                return true;
              }

              // Discard rhymes where less than half of the phonemes match
              return candidate.score < 0.5;
            })
            .sortBy('score')
            .valueOf();

          cb(candidates);
        });
      });
    });
  }, (path.resolve(__dirname, '../data/cmudict.0.7a')));
};
