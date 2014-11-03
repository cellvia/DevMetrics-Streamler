
var util = require('util');
var defaultPersons = [162, 282, 289, 151, 159, 516, 158, 333, 160, 300, 355, 154, 276, 346, 380, 149, 295, 326];
var releaseTestingDates = {"181":"2012-11-12T06:00:00.000Z","182":"2012-12-18T06:00:00.000Z","211":"2012-12-26T06:00:00.000Z","234":"2012-11-05T06:00:00.000Z","276":"2013-02-11T06:00:00.000Z","287":"2013-01-25T06:00:00.000Z","344":"2013-02-22T06:00:00.000Z"};
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;

module.exports = function(streamler){

  /************ROUTER********************/
  streamler
    .router({
      getAuthorNames:         { relayTo: 'releaseTestingDates'},
  	  releaseTestingDates:    { relayTo: 'defectsOpenedByQa' },
      defectsOpenedByQa:      { relayTo: 'allMilestones' },
      allMilestones:          { }
    });

  /************CHANNELS********************/
  streamler
    .addChannel('getAuthorNames', function(){
      this.root.ixPersons = [];
      this
        .source( 'msDb', { query: "Select [ixPerson] from [Metrics].[dbo].[Names]", defaults: defaultPersons, columns: "singleValue" } )
        .filter( 'accumPersons' )
        .done( {onEnd: true, data: "root.ixPersons" } );
    })
    .addChannel('releaseTestingDates', function( ixPersons ){
      this.root.releaseTestingDates = {};
      this
        .source( 'msDb', { query: "Select [MilestoneId],[ReleaseDate] from [Metrics].[dbo].[ReleaseDates]", defaults: releaseTestingDates, columns: "columnValues" } )
        .filter( 'accumDates' )
        .done( {onEnd: true, data: [ ixPersons, "root.releaseTestingDates"] } );
    })
    .addChannel('defectsOpenedByQa', function( ixPersons, releaseTestingDates ){
      this.root.accumulator = {};
      this
        .source('hgetallStream', {collection: 'fogbugz:ticket:*', command: 'keys'} )
        .filter( 'tickets' )
        .filter( 'incrCounter' )
        .filter( 'accumulateMap', { ixPersons: ixPersons, releaseTestingDates: releaseTestingDates } )
        .dumper( 'console', { data: "root.count", label: 'Tickets processed', onEnd: true } )
        .done( { onEnd: true, data: "root.accumulator" } );
    })
    .addChannel('allMilestones', function( accumulator ){
      this.root.accumulator = accumulator;
      this
        .source('hgetallStream', {collection: 'fogbugz:fixfors', command: 'smembers'} )
        .filter( 'milestones' )
        .filter( 'incrCounter' )
        .dumper( 'db', { collection: 'fogbugz.milestones', command: 'publish' } )
        .dumper( 'console', { label: 'milestones processed', data: "root.count", onEnd: true } )
        .done( );
    });


  /************SOURCES*********************/

  streamler
    .addSource('msDb', function(options){
          var stream = streamler.through2.call(this),
              connection = new Connection({
                userName: 'testdev',
                password: 'testdev',
                server: 'qa-auto-ui-db01.devid.local',
                connectTimeout: 3000
              });
          connection.on('connect', function(err) {
            if (err) {
              console.error('Received error', err);
              if(options.defaults && options.defaults.length){
                options.defaults.forEach(function(item){
                  stream.emit("data", item);
                })
              }else if( options.defaults ){
                stream.emit("data", options.defaults);                
              }
              stream.emit("end");
            } else {
              var request = new Request(options.query, function(err, rowCount) {
                if (err) {
                  console.log(err + 'for query: '+ options.query);
                  process.exit();
                } else {
                  console.log(rowCount + ' rows for query: '+ options.query);
                }
              });
              request.on('row', function(columns) {
                var emitme;
                switch(options.columns){
                  case "singleValue":
                    emitme = columns[0].value;
                  break;
                  case "columnValues":
                    emitme = [];
                    columns.forEach(function(item){
                      emitme.push(item.value);
                    })
                  break;
                  default:
                    emitme = columns;
                  break;
                }
                stream.emit("data", emitme );
              });
              request.on('doneProc', function(){
                stream.emit("end");
                process.nextTick( connection.close.bind(connection) );
              });
              connection.execSql(request);
            };
          });
          return stream;
    });

  /************FILTERS********************/
  require('./filters')(streamler);

}
