
module.exports = function(streamler){

  /************ROUTER********************/
  streamler
    .router({
      authenticate:         { relayTo: 'allRepos', waitTilComplete: true },
      allRepos:             { relayTo: 'changesetsProcessor' },
      changesetsProcessor:  { relayTo: 'branchDiffHeaders' },
      branchDiffHeaders:    { relayTo: 'finishedChangesets' },
      finishedChangesets:   { }
    });

  /************CHANNELS********************/
  require('./channels')(streamler);

  /************SOURCES********************/
  require('./sources')(streamler);

  /************FILTERS********************/
  require('./filters')(streamler);

}
