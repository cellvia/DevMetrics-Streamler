var EventEmitter = require('events').EventEmitter,
  util = require('util'),
  through2 = require("./through2"),
  redis = require('redis');

module.exports = Streamler;

function Streamler(mainmap, settings, extra){
  console.log("streamler created")
  EventEmitter.call(this);
  this.jobsLeft = 0;
  this.routesLeft = 0;
  this.Sourcer = new Sourcer(settings);
  this.channels = {};
  this.filters = {};
  this.dumpers = {};
  this.cache = {};
  this.cache.initiated = {};
  this.settings = settings;
  this.timers = {};

  this._initialized = false;
  this._currentMetric = 'global';
  this._globalStart = process.hrtime();
  
  settings.verbose && console.log('loading redis client...');
  this.client = redis.createClient(settings.redisPort, settings.redisHost);
  this.client.on('connect', function() { console.log('Connected to redis: client'); });
  this.client.on('ready', function() { console.log('Ready to work with redis: client'); });
  this.client.on('end', function() { console.log('Disconnected from redis: client'); });
  this.client.on('idle', function() { console.log('Idling from redis: client'); });
  this.client.on('error', function(error) { console.log(error+": client"); process.exit();});

  this.publisher = redis.createClient(settings.redisPort, settings.redisHost);
  this.publisher.on('connect', function() { console.log('Connected to redis: publisher'); });
  this.publisher.on('ready', function() { console.log('Ready to work with redis: publisher'); });
  this.publisher.on('end', function() { console.log('Disconnected from redis: publisher'); });
  this.publisher.on('idle', function() { console.log('Idling from redis: publisher'); });
  this.publisher.on('error', function(error) { console.log(error+": publisher"); process.exit();});

  if(settings.argv.refill){
    var me = this
    this.client.on('ready', function(){
      console.log("FLUSHING DB");
      me.client.send_command('FLUSHDB', []);
    });
  }

  settings.verbose && console.log("loading StreamlerCore...");
  require('./StreamlerCore')(this);

  this._init.call(this, mainmap, extra);

}


util.inherits(Streamler, EventEmitter);

Streamler.prototype.init = function(){
  this.emit("_init");
}

Streamler.prototype._init = function(routemap, arg){
  if( this._initialized
      || typeof routemap === "string" 
      || !routemap.length 
      || this.listeners('_init').length 
  ){
      console.log("init already assigned, or incorrect type (must be array)")
      process.exit();
  }
  console.log("init map loaded " + util.inspect(routemap));
  this._initialized = true;
  this.arg = arg; //extra args provided at instantiation
  
  routemap = routemap.map(function(rt){return rt.trim();});
  //build parent map
  var parentmap = {};
  for(var len = routemap.length, n = 0; len && n < len; n++){
    this.loadMetric(routemap[n]);
    parentmap[routemap[n]] = {
      routeTo: routemap[n+1] ? routemap[n+1] : '_completed',
    };
  }
  this.loadEndpoint(parentmap);
  this.parentmap = parentmap;
  var firstProp,
      func;
  for(var first in parentmap){ firstProp = first; break; }
  func = function(){ this.emitRoute.call( this, firstProp ); }
  Streamler.super_.prototype.on.call(this, '_init', func);
}

Streamler.prototype.setMetric = function(metric){
  this._currentMetric = metric;
  return this;
}

Streamler.prototype.resetMetric = function(){
  this._currentMetric = 'global';
  return this;
}

Streamler.prototype.loadMetric = function(metric){
  this.setMetric(metric);
  console.log('loading '+metric+' metric...');
  var path = "./metrics/" + metric;
  require(path)(this);
  this.resetMetric();
}

Streamler.prototype.loadEndpoint = function(map){
    this
      .setMetric('_completed')
      .router({
        _completed: { }
      })
      .addChannel("_completed", function(){
        var ascii = "                           ,---.~                          /    |~                         /     |~     thou art done      /      |~                       /       |~                  ___,'        |~                <  -'          :~                 `-.__..--'``-,_\\_~                    |o/ <o>` :,.)_`>~                    :/ `     ||/)~                    (_.).__,-` |\\~                    /( `.``   `| :~                    \\'`-.)  `  ; ;~                    | `       /-<~                    |     `  /   `.~    ,-_-..____     /|  `    :__..-'\\~   /,'-.__\\\\  ``-./ :`      ;       \\~   `\\ `\\  `\\\\  \\ :  (   `  /  ,   `. \\~     \\` \\   \\\\   |  | `   :  :     .\\ \\~      \\ `\\_  ))  :  ;     |  |      ): :~     (`-.-'\\ ||  |\\ \\   ` ;  ;       | |~      \\-_   `;;._   ( `  /  /_       | |~       `-.-.// ,'`-._\\__/_,'         ; |~          \\:: :     /     `     ,   /  |~           || |    (        ,' /   /   |~           ||                ,'   / SSt|";
        ascii = ascii.split("~");
        ascii.forEach(function(asc){
          console.log(asc);
        })
        var timers = this.streamler.timers
        for( var _metric in timers){
          if(_metric.indexOf("_") === 0) continue
          for(var _chan in timers[_metric]){
            if(!timers[_metric][_chan].length || _chan.indexOf("_") === 0) continue
            var arr = timers[_metric][_chan];
            avg = arr.reduce(function(a,b,ind){
              return ind !== arr.length-1 ? a+b : (a+b) / arr.length;
            });
            console.log( _metric+": "+_chan+": "+avg+" sec (avg of " + arr.length + " chunks)" );
          }
        }
        var timediffs = process.hrtime(this.streamler._globalStart);
        console.log("total: ~"+timediffs[0] + "." + timediffs[1] + " sec");
        typeof timediffs[0] === 'undefined' && console.log('(To use performance timers Please switch node version to v0.8 or higher)')
        this.streamler.client.end();
        this.streamler.publisher.end();
      })
      .resetMetric();
    map['_completed'] = { endPoint: true };
}

Streamler.prototype.router = function(routemap, arg){
  var routename = this._currentMetric;
  if( this.listeners(routename).length && typeof routemap){
      console.log("route " + routename + " already assigned, or incorrect type (must be object)")
      process.exit();
  }
  this.settings.verbose && console.log("loaded router for  " +routename /*+ util.inspect(routemap)*/)
  this.arg = arg;

  var firstProp; 
  for(var first in routemap){ firstProp = first; break; }

  var context = {
    routename: routename,
    streamler: this,
    metric: this.metric || this._currentMetric,
    routemap: routemap,
    arg: this.arg
  }

  var func = function(){
    this.Sourcer.currentChannel = firstProp;
    this.channels[context.metric][firstProp].call(context) 
  }

  Streamler.super_.prototype.on.call(this, routename, func);
  return this;
}

Streamler.prototype.emitRoute = function(routename, args){
  if( routename !== 'newListener' ){
    this.Sourcer.currentMetric = routename;
    this.routesLeft++;
    !~routename.indexOf("_") && console.log("*** starting "+routename);
  }
  Streamler.super_.prototype.emit.call(this, routename, args);
}

Streamler.prototype.routeDone = function(){
  if(--this.streamler.routesLeft === 0){
    !~this.metric.indexOf("_") && console.log("*** completed "+this.metric);
    var routeTo = this.streamler.parentmap[this.metric].routeTo;
    if(routeTo)
      this.streamler.emitRoute( routeTo );
  }
}

Streamler.prototype.channelDone = function(){

  var me = this,
      streamler = me.streamler,
      root = me.root,
      routemap = me.routemap,
      route = routemap[me.channelname];

  if(!route){
    console.log("no more routes!");
    process.exit();
  }

  var relays = typeof route.relayTo === "string" ? [route.relayTo] : route.relayTo,
      waitTilChannelComplete = !!route.waitTilComplete, //make into boolean
      doneArgs = Array.prototype.slice.call(arguments, 0),
      pumpOpts = doneArgs.shift() || me.root.pumpOpts;

  if(!waitTilChannelComplete && pumpOpts && pumpOpts.onEnd && !pumpOpts.data && !doneArgs.length )
    throw new Error("no data prop provided. this is needed to pump from 'root' in 'done()' from " +me.channelname);
  if(pumpOpts && typeof pumpOpts.data === "string") pumpOpts.data = ["" + pumpOpts.data];
  if(pumpOpts && pumpOpts.data && !(pumpOpts.data instanceof Array)) throw new Error("must pass in string / array to data prop!");

  var context = {
        streamler: streamler,
        routemap: routemap,
        metric: me.metric,
        root: {count: 0},
        source: streamler.source
      },
      sender,
      ender;

  if(relays && !waitTilChannelComplete && !(pumpOpts && pumpOpts.onEnd)){
    sender = function(piped){
      /*create data to apply at time of send*/
      var root = this.root,
          dataToApply = [piped].concat( doneArgs ),
          data;
      if( pumpOpts && pumpOpts.data && pumpOpts.data.length){
        data = pumpOpts.data.map(function(val){
          var assemble;
          if(typeof val === "string" && ~val.indexOf(".") && !~val.indexOf(" ") ){            
            var props = val.split(".");
            if(props.shift() === "root")
              assemble = root;
            else
              assemble = piped;
            for(var n=0; n<props.length;n++){
              assemble = (typeof assemble !== "undefined" && assemble.hasOwnProperty(props[n])) ? assemble[props[n]] : assemble;
            }
          }
          val = (typeof assemble !== "undefined") ? assemble : val;
          return val;
        });
        dataToApply = dataToApply.concat( data );
      }
      relays.forEach( function(pumpTo) {
        streamler.Sourcer.currentChannel = context.channelname = pumpTo;
        if( typeof streamler.channels[context.metric][pumpTo] === "function" )
          streamler.channels[context.metric][pumpTo].apply( context, dataToApply );
        else if( typeof streamler.channels.global[pumpTo] === "function" )
          streamler.channels.global[pumpTo].apply( context, dataToApply );
      });
      this.emit("data", piped);
    };
  }

  ender = function(){    
    this.emit("end")
    /*create data to apply at time of end*/
    var root = this.root,
        dataToApply = [],
        data;
    if( pumpOpts && pumpOpts.onEnd && pumpOpts.data && pumpOpts.data.length){
      data = pumpOpts.data.map(function(val){
        var assemble;
        if(typeof val === "string"){
          var props = val.split(".");
          if(props.shift() === "root")
            assemble = root;
          for(var n=0; n<props.length;n++)
            assemble = (typeof assemble !== "undefined" && assemble.hasOwnProperty(props[n])) ? assemble[props[n]] : assemble;
        }
        val = (typeof assemble !== "undefined") ? assemble : val;
        return val;
      });
      dataToApply = dataToApply.concat( data );
    }
    dataToApply = dataToApply.concat( doneArgs );
    /* pumping onEnd, but not waiting til the entire route is complete */
    if( !waitTilChannelComplete && relays && relays.length && pumpOpts && pumpOpts.onEnd ){
        relays.forEach( function(pumpTo) {
          streamler.Sourcer.currentChannel = context.channelname = pumpTo;
          streamler.channels[context.metric][pumpTo].apply( context, dataToApply );
        });
    }
    /* relaying when entire route is complete */
    if( --streamler.jobsLeft === 0 ){
      /* clean up stream cache  */
      for( var strm in streamler.cache ){
        if(typeof streamler.cache[strm].write !== "function") continue
        if(streamler.cache[strm].writable)
            streamler.cache[strm].emit("done");
        delete streamler.cache["initiated"][strm];
      };
      /*if there are no  further relays set, then this is an endpoint */
      if( !relays || !relays.length ){
        streamler.routeDone.call(context);
      } else if( waitTilChannelComplete && relays && relays.length ){
        relays.forEach(function(relay){
          streamler.Sourcer.currentChannel = context.channelname = relay;
          streamler.channels[context.metric][relay].apply(context, dataToApply);
        })
      } 
    }
  }

  var out = streamler.through2.call(this, sender, ender);
  if(streamler.settings.argv.timer) {
    out.pipe( streamler.filters["global"].timer.call(this) );
  }
  return out;
}

/****************CHANNELER*******************/
Streamler.prototype.addChannel = function( label, func ){
  var metric = this._currentMetric || 'global';
  if(typeof this.channels[metric] === "undefined") this.channels[metric] = {};
  if(typeof this.channels[metric][label] !== "undefined") console.log (label + " channel already exists on this Streamler, overwriting!");

  this.timers[metric] = this.timers[metric] || {};
  this.timers[metric][label] = this.timers[metric][label] || [];

  this.channels[metric][label] = function(){
    /*when we create a channel, we have to create a custom context/this for it, so we can access everything inside*/
    
    var context = {
      streamler: this.streamler/* || this*/,
      routename: this.routename,
      routemap: this.routemap,
      metric: metric,
      root: { count: 0 },
      channelname: label,
      _start: process.hrtime()      
    };
    context.sourcer = context.streamler.Sourcer[context.metric] || context.streamler.Sourcer["global"];
    context.streamler.jobsLeft++;
    context.source = context.streamler.source.bind(context);

    func.apply(context, arguments);
  };
  return this;
}

Streamler.prototype.source = function( func, options ){
  var root = this.streamler.Sourcer[this.metric] || this.streamler.Sourcer["global"];
  if(!root){ console.log("this source doesnt exist: " + func + " in this channel: "+ this.metric + this.channelname ); process.exit(); }
  return root[func].call(this, options);
}

/****************PUMPER*******************/
Streamler.prototype.addDumper = function( label, func ){
  var metric = this._currentMetric;
  if(typeof this.dumpers[metric] === "undefined") this.dumpers[metric] = {};
  if(typeof this.dumpers[metric][label] !== "undefined") console.log (label + " dumper already exists on this Streamler, overwriting!");
  this.dumpers[metric][label] = func;
  return this;
}

/****************FILTER*******************/
Streamler.prototype.addFilter = function( label, func ){ 
  var metric = this._currentMetric;
  if(typeof this.filters[metric] === "undefined") this.filters[metric] = {};
  if(typeof this.filters[metric][label] !== "undefined") console.log (label + " filter already exists on this Streamler, overwriting!");
  this.filters[metric][label] = func;
  return this;
};

/****************SOURCER*******************/
Streamler.prototype.addSource = function( label, func ){ 
  var metric = this._currentMetric;
  this.Sourcer.add(label, metric, func); 
  return this;
};

function Sourcer(settings){
    console.log("sourcer created");
    this.concurrency = settings.maxAsync;
    this.requests = 0;
    this.queue = [];
    this.settings = settings;
};

Sourcer.prototype = require('./SourcerPrototype.js');

Sourcer.prototype.add = function(label, metric, func){
    if(typeof this[metric] === "undefined") this[metric] = {};
    if(typeof this[metric][label] !== "undefined") console.log (label + " sourcer already exists on this Streamler, overwriting!");
    //reload all globals into this streamler... dirty but have to do it for now
    for( var funky in this["global"] ){
      if(typeof this["global"][funky] === "function" && typeof this[metric][funky] === "undefined"){
        this[metric][funky] = this["global"][funky];
      }
    }
    this[metric][label] = func;
};

Streamler.prototype.push = Sourcer.prototype.push = function(topush){
  var out = through2.call(this);
  if(typeof topush !== 'function'){
    process.nextTick(function(){
      out.emit("data", topush);
      out.emit("end");
    });
  }else{
    topush.call(out, function(){
      out.emit("end");
    });
  }
  return out;
};

Streamler.prototype.through2 = Sourcer.prototype.through2 = through2;

Streamler.prototype.sanitizeFilename = Sourcer.prototype.sanitizeFilename = function(filename){ return filename.replace(/[\?\[\]\\\=\<\>\:\;\,\'\&\$\#\*\(\)\|\~\`\\"!\{\}\%]/g, '_').trim(); };

Streamler.prototype.extend = Sourcer.prototype.extend = function(a, b) { a = a || {}; for (var x in b){ a[x] = b[x]; } return a; };

Streamler.prototype.merge = Sourcer.prototype.merge = function(a, b) { a = a || {}; for (var x in b){ if(a[x]) continue; a[x] = b[x]; } return a; };
