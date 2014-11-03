var fs = require('fs'),
  util = require('util'),
  mkdirp = require('mkdirp');

module.exports = function(streamler){
  var through2 = streamler.through2,
      client = streamler.client,
      publisher = streamler.publisher,
      sanitizeFilename = streamler.sanitizeFilename;

  streamler
    .setMetric('global')
    .addFilter( 'incrCounter', function(){
      return through2.call(this, function(data){
        ++this.root.count;
        this.emit("data", data);
      });
    })
    .addFilter( 'timer', function(){
      return through2.call(this, null, function(){
        var timers = this.streamler.timers[this.metric][this.channelname],
            diffs = process.hrtime( this._start ),
            val = parseFloat( diffs[0] + "." + diffs[1] );
        timers.push( val );
        this.emit("end");
      });
    })
    .addSource( 'keysStream', function(options){
      if(!client || !options.collection || !options.command) throw new Error("needs a client and a streamclient and a set collection");
        var wrappipe = through2.call(this),
            command = 'keys',
            collections = typeof options.collection === 'string' ? [options.collection] : options.collection;
        streamler.settings.verbose && console.log("streaming set "+collections+" from redis")

        var keyReqs = 0;
        collections.forEach(function(collection){
          keyReqs++;
          client[command](collection, function(er, keys){
            keyReqs--;
            keys.forEach(function(key){             
              wrappipe.emit("data", key);
            });
            if(keyReqs === 0)
              wrappipe.emit("end");
          });
        });

        return wrappipe;
   }) 
    .addSource( 'hgetallStream', function(options){
      if(!client || !options.collection || !options.command) throw new Error("needs a client and a streamclient and a set collection");
      var wrappipe = through2.call(this),
          command = options.command,
          collections = typeof options.collection === 'string' ? [options.collection] : options.collection;
      streamler.settings.verbose && console.log("streaming set "+collections+" from redis")

      var keyReqs = 0, 
          getReqs = 0;
      collections.forEach(function(collection){
        keyReqs++;
        client[command](collection, function(er, items){
          keyReqs--;
          items.forEach(function(item){
            getReqs++;
            client.hgetall(item, function(err, res){                
              wrappipe.emit("data", res);
              if(--getReqs === 0 && keyReqs === 0){
                process.nextTick(function(){ wrappipe.emit("end"); });
              }
            })
          })
          if(!items || !items.length)
            process.nextTick(function(){ wrappipe.emit("end"); });
        });
      });

      return wrappipe;
  })
  .addDumper('db', function(options){
    if(!options) options = {};
    if(options.data && typeof options.data !== "string") throw new Error("options.data must be a single string for db dumper");
    if(!publisher || !options.command || !options.collection) throw new Error("needs a publisher and a command and a collection");
    var sender = function(piped){
          var root = this.root,
              data;
          if(options.data && ~options.data.indexOf(".") && !~options.data.indexOf(" ")){
            var assemble,
                props = options.data.split(".");
            if(props.shift() === "root")
              assemble = root;
            else
              assemble = piped;
            for(var n=0; n<props.length;n++)
              assemble = (typeof assemble !== "undefined" && assemble.hasOwnProperty(props[n])) ? assemble[props[n]] : assemble;
            options.data = (typeof assemble !== "undefined") ? assemble : options.data;
            data = JSON.stringify(options.data);
          }else{
            data = piped;
          }
          if(typeof data !== "string") data = JSON.stringify(data);
          publisher[options.command](options.collection, data);
        };
    if(options.onEnd) return through2.call(this, null, sender )
    return through2.call( this, sender, null );
  })
  .addDumper('console', function(options){
    if(!options) options = {};
    if(typeof options.data === "string") options.data = [options.data];
    else if (!options.data) options.data = [];
    if(!(options.data instanceof Array)) throw new Error("must pass in array or string to data prop!");

    var sender = function(piped){ 
      var root = this.root,
          toFormat,
          labels = "";
      if(options.data.length){
        toFormat = options.data.map(function(val, ind){
          var assemble;
          if(typeof val === "string" && ~val.indexOf(".") && !~val.indexOf(" ")){
            labels += val+": %s, ";
            var props = val.split(".");
            if(props.shift() === "root")
              assemble = root;
            else
              assemble = piped;            
            for(var n=0; n<props.length;n++)
              assemble = (typeof assemble !== "undefined" && assemble.hasOwnProperty(props[n])) ? assemble[props[n]] : assemble;
          }else{
            labels += ""+ind+": %s, ";
          }
          val = (typeof assemble !== "undefined") ? assemble : val;
          return util.inspect(val, false, 10, true);
        });
      }else{
        toFormat = [util.inspect(piped, false, 10, true)];
      }
      options.label = options.label || (this.channelname + " " + labels.slice(0,-2) );
      console.log( util.format.apply( this, [options.label].concat(toFormat) ) )
    };
    if(options.onEnd) return through2.call( this, null, sender )
    return through2.call(this, sender);
  })
  .addDumper('log', function(options){
    if(!options) options = {};
    if(!options.filename) options.filename = "../logs/" + this.metric + "/" + this.channelname + "_" + (options.label ? options.label : (+new Date())) + ".json";
    if(options.onEnd && !options.data && !this.root.data) throw new Error("dump " + filename + ": if onEnd, must have 'data' var!");  
    if(typeof options.data === "string") options.data = [options.data];
    else if (!options.data) options.data = [];
    if(!(options.data instanceof Array)) throw new Error("must pass in array or string to data prop!");

    var filename = sanitizeFilename(options.filename),
        started = false,
        deleteFile = options.hasOwnProperty('deleteFile') ? options.deleteFile : true,
        makepath = filename.split('/').slice(0,-1).join('/'),
        wrappipe;

    console.log("creating log : "+filename)
    if(!streamler.cache["initiated"][filename]){
      if( !fs.existsSync( makepath ) ) mkdirp.sync( makepath ); 
      streamler.cache["initiated"][filename] = true;
    }else{
      console.log("writing to same file twice! " + filename);
      process.exit();
    }
    var filestrm = fs.createWriteStream( filename );
    filestrm.setMaxListeners(0);
    filestrm.on("error", function(err){
      console.log(err+", continuing");
    });

    if(options.onEnd){
      wrapPipe = through2.call( this, function(){ },
        function(){
          var root = this.root;
          if(options.data.length){
            var finalObj = {};
            options.data.forEach(function(val, ind){
              var assemble;
              if(typeof val === "string" && ~val.indexOf(".") && !~val.indexOf(" ") ){
                var props = val.split(".");
                if(props.shift() === "root")
                  assemble = root;
                else{
                  finalObj[ind] = val;
                  return true;
                }
                for(var n=0; n<props.length;n++)
                  assemble = (typeof assemble !== "undefined" && assemble.hasOwnProperty(props[n])) ? assemble[props[n]] : assemble;
                finalObj[val] = assemble;
              }else{
                finalObj[""+ind] = val;
              }
            });
            this.emit("data", JSON.stringify(finalObj) );
          }
          this.emit("end");
        });
    }else{
      wrapPipe = through2.call( this, 
        function(piped){ 
          var root = this.root;
          if(options.data.length){
            var finalObj = {};
            options.data.forEach(function(val, ind){
              var assemble;
              if(typeof val === "string" && ~val.indexOf(".") && !~val.indexOf(" ")){
                var props = val.split(".");
                if(props.shift() === "root")
                  assemble = root;
                else
                  assemble = piped;
                for(var n=0; n<props.length;n++)
                  assemble = (typeof assemble !== "undefined" && assemble.hasOwnProperty(props[n])) ? assemble[props[n]] : assemble;
                finalObj[val] = assemble;
              }else{
                finalObj[""+ind] = val;
              }
            });
            data = finalObj;
          }else{
            data = piped;
          }
          data = started ? "," + JSON.stringify(data) : "[" + JSON.stringify(data);
          started = true;
          this.emit("data", data); 
        },  
        function(){
          this.emit("data", "]");
          this.emit("end");
        });
    }

    wrapPipe.pipe( filestrm );

    return wrapPipe;
  })
  .addDumper('delete', function(){
    if(!client) throw new Error("needs a client");
    var m = client.multi();
    return through2.call( this, 
      function(piped){
            m.del(piped);
            this.emit("data", piped);
      }, function(){
        var me = this;
            m.exec(function(){
          me.emit("end")
            });
      });
  })
  .resetMetric();

}
