
var util = require('util');

module.exports = function(streamler){

  var settings = streamler.settings;

  /************ROUTER********************/
  streamler
    .router({
      clearPrecalculatedReports:    { relayTo: 'checkPrecalculatedReports', waitTilComplete: true },
      checkPrecalculatedReports:    { relayTo: 'buildMilestoneReport', waitTilComplete: true },
      buildMilestoneReport:         { }
    });

  /************CHANNELS********************/
  streamler
    .addChannel('clearPrecalculatedReports', function(){
      this
        .source( 'keysStream', {command: 'keys', collection: 'fogbugz:fixfor:*:report:*'} )
        .dumper( 'console', {condition: settings.debug === "byMilestoneReport"} )
        .filter( 'incrCounter' )
        .dumper( 'console', {label: '%s checkPrecalculatedReports being deleted', data: "root.count", onEnd: true} )
        .dumper( 'delete' )
        .done();
    })
    .addChannel('checkPrecalculatedReports', function(){
      this
        .source( 'keysStream', {command: 'keys', collection: 'fogbugz:fixfor:*:report:*'} )
        .dumper('console', {condition: settings.debug === "byMilestoneReport"} )
        .filter( 'incrCounter' )
        .dumper( 'console', {label: '%s checkPrecalculatedReports left', data: "root.count", onEnd: true} )
        .done();
    })
    .addChannel('buildMilestoneReport', function(){
      this
        .source( 'hgetallStream', {command: 'keys', collection: 'fogbugz:ticket:*'} )
        .dumper( 'console', {condition: settings.debug === "byMilestoneReport"} )
        .filter( 'tickets' )
        .filter( 'incrCounter' )
        .filter( 'milestoneReport' )
        .dumper( 'console', {label: '%s tickets processed for milestone report', data: "root.count", onEnd: true} )
        .done();
    });

  /************FILTERS********************/
  require('./filters')(streamler);

}
