
var util = require('util');
var ixPersons = [162, 282, 289, 151, 159, 516, 158, 333, 160, 300, 355, 154, 276, 346, 380, 149, 295, 326];
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;

module.exports = function(streamler){

  /************ROUTER********************/
  streamler
    .router({
      getAuthorNames:         { relayTo: 'returnsPerRelease' },
      returnsPerRelease:      { relayTo: 'allMilestones' },
      allMilestones:          { }
    });

  /************CHANNELS********************/
  streamler
    .addChannel('getAuthorNames', function(){
      this.root.ixPersons = [];
      this
        .source( 'msDb', { query: "Select [ixPerson] from [Metrics].[dbo].[Names]", defaults: ixPersons, columns: "singleValue" } )
        .filter( 'accumPersons' )
        .done( {onEnd: true, data: "root.ixPersons" } );
    })
    .addChannel('returnsPerRelease', function( ixPersons ){
      this.root.accumulator = {};
      this
        .source('hgetallStream', {collection: 'fogbugz:ticket:*', command: 'keys'} )
        .filt( 'tickets' )
        .filt( 'incrCounter' )
        .filt( 'accumulateMap', {ixPersons: ixPersons} )
        .dump( 'console', { data: "root.count", label: 'Tickets processed', onEnd: true } )
        .done( { onEnd: true, data: 'root.accumulator' } );
    })
    .addChannel('allMilestones', function( accumulator ){
      this.root.accumulator = accumulator;
      this
        .source('hgetallStream', {collection: 'fogbugz:fixfors', command: 'smembers'} )
        .filt( 'milestones' )
        .filt( 'incrCounter' )
        .dump( 'db', { collection: 'fogbugz.milestones', command: 'publish' } )
        .dump( 'console', { label: 'milestones processed', data: "root.count", onEnd: true } )
        .done( );
    });

  /************SOURCES*********************/

  streamler
    .addSource('msDb', function(options){
          var stream = streamler.through2(),
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
          return streamler.through2.call(this).convert(stream);
    });

  /************FILTERS********************/
  require('./filters')(streamler);

}
