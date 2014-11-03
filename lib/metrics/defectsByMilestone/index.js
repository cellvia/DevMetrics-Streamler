
var util = require('util');

module.exports = function(streamler){
  var settings = streamler.settings;

  /************ROUTER********************/
  streamler
    .router({
      allMilestones:                { relayTo: 'buildDefectReport' },
      buildDefectReport:            { relayTo: 'backtoDB' },
      backtoDB:                     { }
    });

  streamler
    .addChannel('allMilestones', function( ){
      this.root.milestoneMap = {};
      this
        .source( 'hgetallStream', {command: 'smembers', collection: 'fogbugz:fixfors'} )
        .filter( 'milestones' )
        .filter( 'incrCounter' )
        .dumper( 'console', { label: '%s milestones processed to make map ', data: "root.count", onEnd: true } )
        .dumper( 'log', { label: 'milestoneMapBefore', data: "root.milestoneMap", onEnd: true, condition: settings.argv.log } )
        .done( { data: 'root.milestoneMap', onEnd: true } );
    })
    .addChannel('buildDefectReport', function( milestoneMap ){
      this.root.milestoneMap = milestoneMap;
      this
        .source( 'hgetallStream', {command: 'keys', collection: 'fogbugz:ticket:*'} )
        .filter( 'tickets' )
        .filter( 'incrCounter' )
        .filter( 'buildDefectReport' )
        .filter( 'releasedDefects' )
        .filter( 'blankDefects' )
        .filter( 'PEIs' )
        .dumper( 'console', { condition: settings.debug === "defectsByMilestone" } )
        .dumper( 'console', { label: '%s tickets processed for milestone report', data: "root.count", onEnd: true } )
        .done( { data: 'root.milestoneMap', onEnd: true } );
    })
    .addChannel('backtoDB', function( milestoneMap ){
        streamler
          .push.call(this, milestoneMap)
          .dumper( 'log', { label: 'milestoneMapAfter', condition: settings.argv.log } )
          .filter( 'disassembleToMilestones' )
          .dumper( 'log', { label: 'milestoneMapDisassembled', condition: settings.argv.log } )
          .dumper( 'db', { collection: 'fogbugz.milestones', command: 'publish' } )
          .done( );
    });

  /************FILTERS********************/
  require('./filters')(streamler);

}
