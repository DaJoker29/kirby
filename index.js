#! /usr/bin/env node
const craigslist = require('node-craigslist');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const async = require('async');

const config = require('./config.json');

const cities = ['sfbay', 'losangeles', 'sandiego', 'newyork'];
const category = 'cpg';
const interval = 1000 * 60 * 20; // 20min

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/gigs');

const postSchema = mongoose.Schema({
  pid: { type: String, required: true, index: true },
});

const Post = mongoose.model('post', postSchema);

/**
 * Kirby - Automated Craigslist Responder
 */

console.log('START');

cities.forEach((city) => {
  const client = new craigslist.Client({ city });
  // Search City
  client
    .search({ category }, 'website')
    .then((listings) => {
      console.log(`Scraping "${city}"...`);

      const newListings = [];
      async.each(listings, (listing, cb) => {
        Post.findOne({ pid: listing.pid }, (err, post) => {
          if (post) {
            cb();
          } else {
            newListings.push(listing);
            cb();
          }
        });
      }, (err) => {
        if (err) {
          console.log(err);
        } else {
          console.log(`${newListings.length} new listings found in ${city}`);
          newListings.forEach((x) => {
            // Save to Database
            Post.create({ pid: x.pid }, (err) => {
              if (err) {
                console.log(err);
              }
            });
            // Send grab emails
            client
              .details(x)
              .then((details) => {
                console.log(details);
              })
              .catch((err) => {
                if (err) {
                  console.log(err);
                }
              });
          });
        }
      });

      // async.filter(listings, (listing) => {
      //   Post.findOne({ pid: listing.pid }, (err, post) => {
      //     if (err) {
      //       console.log(err);
      //     }
      //     if (post) {
      //       return false;
      //     }
      //     return true;
      //   });
      // });


      // const results = [];
      // listings.forEach((listing) => {
      //   Post.findOne({ pid: listing.pid }, (err, post) => {
      //     if (err) {
      //       console.log(err);
      //     } else if (post) {
      //       return;
      //     } else {
      //       const post = new Post({ pid: listing.pid });
      //       post
      //         .save()
      //         .then(() => {
      //           results.push(listing);
      //         })
      //         .catch((err) => {
      //           if (err) {
      //             console.log(err);
      //           }
      //         });
      //     }
      //   });
      // });
      // console.log(`${results.length} new posts found in ${city}`);
    }).catch((err) => {
      console.log(err);
    });
});