var util = require('util');

module.exports = function(streamler){
  var settings = streamler.settings;

  streamler
    .addChannel( 'authenticate', function(){
      this
        .source( 'authenticate' )
        .dumper( 'console', {label: 'Token: %s'} )
        .done();
    })
    .addChannel('allRepos', function(){
      this
        .source( 'allRepos' )
        .filter( 'repos' )
        .filter( 'incrCounter' )
        .dumper( 'log', { condition: settings.argv.log } )
        .dumper( 'db', { collection: 'fogbugz.repos', command: 'publish' } )
        .dumper( 'console', { label: '%s repos being processed', data: "root.count", onEnd: true } )
        .done();
    })
    .addChannel( 'changesetsProcessor', function(repo){
      this.root.from = 0;
      this
        .source( 'changesets', {ixRepo: repo.ixRepo, refill: settings.argv.refill} )
        .filter( 'changesets' )
        .filter( 'incrCounter' )
        .dumper( 'log', { label: repo.ixRepo, condition: settings.argv.log } )
        .dumper( 'console', { label: "%s Changesets processed for repo " + repo.ixRepo + " from " + this.root.from, data: 'root.count', onEnd: true, condition: settings.verbose } )
        .done();
    })
    .addChannel( 'branchDiffHeaders', function(changeset){
      this
        .source( 'diffs', {changeset: changeset, ixRepo: changeset.ixRepo} )
        .filter( 'incrCounter' )
        .filter( 'branchDiffHeaders' )
        .filter( 'locProcess' )
        .filter( 'changesetRecombine' )
        .dumper( 'console', { label: '%s diffs processed for changeset ' + changeset.rev, data: 'root.count', onEnd: true, condition: settings.debug } )
        .done( { onEnd: true, data: "root.changeset" } );
    })
    .addChannel( 'finishedChangesets', function(changeset){
      streamler
        .push.call( this, changeset )
        .filter( 'incrCounter' )        //increment the counter up
        .dumper( 'log', { label: changeset.ixRepo, condition: settings.argv.log } )
        .dumper( 'db', { collection: 'fogbugz.changesets', command: 'publish'} )
        .dumper( 'console', { onEnd: true, label: '%s - - - finishedChangesets processed for repo ' + changeset.ixRepo, data: 'root.count', condition: settings.debug } )
        .done();
    });

}
