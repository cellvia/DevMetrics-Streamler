
var util = require('util');

module.exports = function(streamler){

  var settings = streamler.settings;

  /************ROUTER********************/
  streamler
    .router({
      pendingReviewAge:         { relayTo: 'allMilestones' },
      allMilestones:            { }
    });

  /************CHANNELS********************/
  streamler
    .addChannel('pendingReviewAge', function(){
      this.root.avgs = {};
      this
        .source( 'hgetallStream', {command: 'keys', collection: 'fogbugz:ticket:*'} )
        .filter( 'tickets' )
        .filter( 'timeReviewToTest' )
        .filter( 'incrCounter' )
        .filter( 'accumulateMap' )
        .dumper( 'log', { data: 'root.avgs', onEnd: true, condition: settings.argv.log } )
        .dumper( 'console', { onEnd: true, label: 'Consolidated averages: %s \nFrom %s tickets processed', data: ['root.avgs', 'root.count'], condition: settings.debug === "pendingReviewAgeAvgs"} )
        .done( { onEnd: true, data: 'root.avgs' } );
    })
    .addChannel('allMilestones', function( avgs ){
      this.root.avgs = avgs;
      this
        .source( 'hgetallStream', {command: 'smembers', collection: 'fogbugz:fixfors'} )
        .filter( 'milestones' )
        .filter( 'incrCounter' )
        .dumper( 'db', { collection: 'fogbugz.milestones', command: 'publish' } )
        .dumper( 'console', { label: 'milestones processed', data: "root.count", onEnd: true } )
        .done( );
    });

  /************FILTERS********************/
  require('./filters')(streamler);

}
