var url = require('url'),
    querystring = require('querystring'),
    util = require('util');

module.exports = function(streamler){

var through2 = streamler.through2,
    source = sourcer = streamler.Sourcer,
    client = streamler.client,
    settings = streamler.extend({}, streamler.settings);

settings.email = settings.argv.u;
settings.password = settings.argv.p;
settings.kilnAPIPath = '/kiln/Api/';
settings.fogbugzAPIPath = '/api.asp?';

streamler
  .addSource( 'authenticate', function(){
    //console.log(util.inspect(this) + "auth for " + this.eventname);
    var query = settings.fogbugzAPIPath + querystring.stringify({cmd: 'logon', email: settings.email, password: settings.password}),
        filedumpOpts = { filename: 'authenticate.xml' },
        parserOpts = { type: 'XMLStream', rule: 'token' },
        stream = sourcer._createStream( url.resolve(settings.ticketHost, query), parserOpts, filedumpOpts ),
        addToken = through2.call(this, function(data){ sourcer.token = data.$text; this.emit("data", sourcer.token); } );
    return stream.pipe(addToken);
  })
  .addSource( 'allRepos', function() {
    console.log("streamAllRepos");
    var repoPath = 'Repos/',
        query = settings.kilnAPIPath + repoPath + '?' + querystring.stringify({token: sourcer.token}),
        filedumpOpts = { filename: repoPath + 'index.json' },
        parserOpts = { type: 'JSONStream', rule: '*'},
        stream = sourcer._createStream( url.resolve(settings.ticketHost, query), parserOpts, filedumpOpts );
    return through2.call(this).convert( stream );
  })
  .addSource( '_changesetsFrom', function(ixRepo, from){
    var changesetPath = '2.0/Repo/'+ixRepo+'/History/',
        query = settings.kilnAPIPath + changesetPath + "?" + querystring.stringify({token: sourcer.token, nChangesetLimit: 100, revOldest: from}),
        filedumpOpts = { filename: changesetPath + '_'+ from + '.json' },
        parserOpts = { type: 'JSONStream', rule: '*'};
    return sourcer._createStream( url.resolve(settings.ticketHost, query), parserOpts, filedumpOpts );
  })
  .addSource( 'diffs', function() {
    var changediffPath = '2.0/Repo/'+this.root.changeset.ixRepo+'/History/'+this.root.changeset.rev,
        query = settings.kilnAPIPath + changediffPath + '?' + querystring.stringify({token: sourcer.token}),
        filedumpOpts = { filename: changediffPath + '.json' },
        parserOpts = { type: 'JSONStream', rule: 'diffs.*.bsLines[0]' },
        stream = sourcer._createStream( url.resolve(settings.ticketHost, query), parserOpts, filedumpOpts );
    return through2.call(this).convert( stream );
  })
  .addSource( 'changesets', function() {
    var me = this,
        from = me.root.from || 0,
        ixRepo = me.root.ixRepo,
        metric = me.metric,
        started = 0;

    var wrapPipe = through2.call(this, function(data){
        data.ixRepo = ixRepo;
        this.emit('data', data);
    });  /* possibly redundant */

    wrapPipe.on('alldone', function(){
      this.emit("end");
      process.nextTick(function(){ wrapPipe.destroy(); }); //"goodbye cruel world..."
    });

    var cb = function(err, offset){
      me.root.from = from = offset || 0;

      var recursive = function(from){
          var recursed = false,
              stream = sourcer[metric]._changesetsFrom(ixRepo, from);

          stream.on("data", function(data){
            if(!recursed){
              started++;
              recursed = true;
              recursive(from+100);  //recurse, advancing forward by 100
            }
          });

          stream.on("end", function(){
            //when all is done, stream will have emitted one extra end event, use this to know when done
            if(--started === -1) wrapPipe.emit("alldone");
          });

          stream.pipe(wrapPipe, {end: false});
      };

      recursive(from);
    }

    if(!me.root.refill)
      me.streamler.client.scard('kiln:repo:' + ixRepo + ':changesets', cb);
    else
      cb(null, from);

    return wrapPipe;
  });

}
