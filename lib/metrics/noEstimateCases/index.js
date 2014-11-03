module.exports = function(streamler){

  var settings = streamler.settings;

  /************ROUTER********************/
  streamler
    .router({
      noEstimateCases:         { relayTo: 'allMilestones' },
      allMilestones:            { }
    });

/*Channels*/
streamler
    .addChannel('noEstimateCases', function(){
      this.root.noEstimateAccumulator = {};
      this
        .source( 'hgetallStream', {command: 'keys', collection: 'fogbugz:ticket:*'} )
        .filter( 'noEstimatetickets' )
        .filter('accumulateMap')
        .dumper( 'log', { data: 'root.noEstimateAccumulator', onEnd: true, condition: settings.argv.log } )
        .done( { onEnd: true, data: 'root.noEstimateAccumulator' } );
    })
    .addChannel('allMilestones', function( noEstimateAccumulator ){
      this.root.noEstimateAccumulator = noEstimateAccumulator;
      this
        .source( 'hgetallStream', {command: 'smembers', collection: 'fogbugz:fixfors'} )
        .filter( 'milestones' )
        .dumper( 'db', { collection: 'fogbugz.milestones', command: 'publish' } )
        .dumper( 'console', { condition: settings.debug } )
        .dumper( 'console', { label: 'milestones processed', data: "root.count", onEnd: true } )
        .done( );
    });



    require('./filters')(streamler);
  }