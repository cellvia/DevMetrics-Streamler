
module.exports = function(streamler){

  /************ROUTER********************/
  streamler
    .router({
      authenticate:               { relayTo: 'allProjects', waitTilComplete: true }
      , allProjects:              { relayTo: 'milestonesByProject' }
      , milestonesByProject:      { relayTo: 'casesByMilestone' }
      , casesByMilestone:         { }
    });

  /************CHANNELS********************/
  require('./channels')(streamler);

  /************SOURCES********************/
  require('./sources')(streamler);

  /************FILTERS********************/
  require('./filters')(streamler);

}
