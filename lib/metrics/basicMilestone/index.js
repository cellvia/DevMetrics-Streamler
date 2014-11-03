
var util = require('util');

module.exports = function(streamler){

  var settings = streamler.settings;

  /************ROUTER********************/
  streamler
    .router({
      allMilestones:          { relayTo: 'ticketsByMilestone'},
      ticketsByMilestone:     { }
    });

  /************CHANNELS********************/
  streamler
    .addChannel('allMilestones', function( ){
      this
        .source( 'hgetallStream', {command: 'smembers', collection: 'fogbugz:fixfors'} )
        .filter( 'milestones' )
        .filter( 'incrCounter' )
        .dumper( 'console', { onEnd: true, label: '%s milestones being processed', data: 'root.count' } )
        .done( );
    })
    .addChannel('ticketsByMilestone', function( milestone ){
      this.root.milestone = milestone;
      this
        .source( 'hgetallStream', {command: 'smembers', collection: 'fogbugz:fixfor:'+milestone.ixFixFor+':tickets'} )
        .filter( 'incrCounter' )
        .filter( 'accumulateToMilestone' )
        .dumper( 'console', { onEnd: true, label: '%s tickets for milestone %s', data: ['root.count', milestone.sFixFor], condition: settings.verbose } )
        .dumper( 'db', { onEnd: true, command: 'publish', collection: "fogbugz.milestones", data: 'root.milestone' } )
        .done( );
    });


  /************FILTERS********************/
  require('./filters')(streamler);

}
