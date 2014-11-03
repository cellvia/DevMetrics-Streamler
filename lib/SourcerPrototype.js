var url = require('url'),
    request = require('request'),
    querystring = require('querystring'),
    JSONStream = require('JSONStream'),
    XMLStream = require('./xml-stream'),
    util = require('util'),
    fs = require('fs'),
    mkdirs = require('mkdirp');

module.exports = {

	_createStream: function(url, parseOpts, fileopts) {
		if(!fileopts) fileopts = {};			
    fileopts.filename = "../logs/_raw/" + this.currentMetric + "/" + (fileopts.filename || this.currentChannel + ".raw");
    fileopts.filename = this.sanitizeFilename( fileopts.filename );
    if(!fileopts.hasOwnProperty('swap') && this.settings.argv.swap)
    	fileopts.swap = this.settings.argv.swap;
    if(!fileopts.hasOwnProperty('dump') && this.settings.argv.dump)
    	fileopts.dump = this.settings.argv.dump;
    if(!fileopts.dump && fileopts.swap)
    	fileopts.dump = fileopts.swap;

    var me = this,
    		wrapper2 = this.through2.call(this),
    		retries = -1;

    function build(err, allowEmptyPass){
  		if(++retries || err) console.log(err+" retry: " + retries);
      if(!allowEmptyPass && retries > 4) process.exit();

    	var started = false;

    	/*create parser*/
      var parser = me._createParser(parseOpts);
      parser.on("recur", function(err, allowEmptyPass){ setTimeout(build.bind(parser, err + "[" + url + "]", allowEmptyPass), 5000); });

    	/*create request source*/
	    var source;
	    if( fileopts.swap )
	    	source = me._makeSwappedFilePipe( fileopts.filename, {url: url, parser: parser, fileopts: fileopts} );
		  if(!source)
		    source = me._makeRequest( url, fileopts );
      source.on("recur", function(err){ setTimeout(build.bind(source, err + "[" + url + "]"), 5000); });

      /*create wrapper as gatekeeper*/
      var sender = 	me.settings.argv.emptyRequest
						      	? function(data){ console.log( "empty" ); console.log(data) }
						      	: function(data){ started = true; this.emit("data", data) }
					, ender = parseOpts.allowEmptyPass || allowEmptyPass
										?	null
										: function(){
									    		if(!started){
									    			parser.emit("recur", "empty token return for: " + util.inspect(parseOpts) + "\nat " + url, (retries > 2 ? true : false) );
									    		}else{
									    			this.emit("end");
									    		}
												}
	    		, wrapper = me.through2( sender, ender );

	    /*link them all together*/
	    source.pipe(parser).pipe(wrapper).pipe(wrapper2);
    }

    build();
    return wrapper2;
	},

	_makeSwappedFilePipe: function(filename, origopts){
	    if(!fs.existsSync(filename) || fs.statSync(filename).size === 0) return false;
	    var me = this,
	        swap = fs.createReadStream(filename),
	        wrap = me.through2(),
	        retry = 0;

	    if(this.settings.argv.faultyRequestData && retry < 4){
		    swap = me.through2();
		    setTimeout( function(){ swap.emit("data", "324liuh24lkjh#@#!!!" ); ++retry; }, 5000 );	    	
		    setTimeout( function(){ swap.emit("end" ); }, 6000 );
	    }

	    swap.on("error", function(err){
	      console.log(err+", continuing");
	    })

	    swap.pipe(wrap);
	    return wrap;
	  },

	_makeRequest: function(url, fileopts){
	    var wrapPipe = this.through2.call(this),
	    		me = this,
			    retry = 0;

	    function initRequest(url, wrapPipe, fileopts, retry){
		    var req;
		    me.requests++;
		    if(retry) 
		    	console.log(retry + " retrying this url:" + url)
		    else
		    	retry = 0;

		    if(me.settings.argv.faultyRequest && retry < 4){
			    req = me.through2();
			    req.abort = function(){}
			    setTimeout( req.emit.bind(req, "error", new Error("<-- emitted error for --faultyRequest")), 5000 );
		    } else if(me.settings.argv.faultyRequestData && retry < 4){
			    req = me.through2();
			    setTimeout( req.emit.bind(req, "data", "324liuh24lkjh#@#!!!" ), 5000 );
			    setTimeout( req.emit.bind(req, "end" ), 5500 );
			  } else {
		      req = request({url: url});
		      if(fileopts.dump){ 
			    	console.log('creating swap: ' + fileopts.filename);
			      var filestream = me._createFileDump(fileopts);
			      req.pipe(filestream);
			    }
		    }
		    req.on('error', function(err) {
		      me.requests--;
		      this.abort(); 
		      wrapPipe.emit("recur", new Error("request error " + err) );
		    });
		    req.on('end', function(){
		      me.requests--;
		      var next = me.queue.shift();
		      if(typeof next === "function") next();
		    })
		    req.pipe(wrapPipe);
	    }

	    wrapPipe.on("error", function(err){ console.log("req wrappipe error: " + err) });

	    if(me.requests > me.concurrency){
	      me.queue.push(initRequest.bind(me, url, wrapPipe, fileopts));
	    }else{
	      initRequest(url, wrapPipe, fileopts);
	    }

	    return wrapPipe;
	  },

	_createParser: function(parseOpts){
	    switch(parseOpts.type){
	      case "JSONStream":
	        var rule = this._translateJSONRule(parseOpts.rule),
	            parser = JSONStream.parse(rule);
	      break
	      case "XMLStream":
	        var rule = this._translateXMLRule(parseOpts.rule),
	            wrapPipe = this.through2(),
	            xml = new XMLStream(wrapPipe, "utf8"),
	            parser;
	            if(parseOpts.preserve && parseOpts.preserve.length){
	              parseOpts.preserve.forEach(function(arr){                
	                xml.preserve(arr);
	              })
	            }
	            xml.on(rule, function(data){
	                parser.write( { fromXML: true, data: data } );
	            });
	            xml.on("error", function(err){
	            	parser.emit("error", "invalid XML received");
	            })
	            parser = this.through2( 
	              function(data){
	                if(data.fromXML){
	                	/* xml stream sucks :(*/
	                  delete data.data.undefined;
	                  delete data.data['$'];
	                  this.emit("data", data.data);
	                }else{
	                  wrapPipe.write(data);
	                }
	              }
	            );
	      break
	    }
      parser.on("error", function(err){ parser.emit("recur", err) });
	    return parser;
	  },

	_createFileDump: function(options){
	    var wrapPipe = this.through2.call(this),
	        makepath = options.filename.split('/').slice(0,-1).join('/');

	    if( options.hasOwnProperty('deleteFile') && !options.deleteFile )
	      mkcb();
	    else
	      fs.unlink(options.filename, mkcb);


	    function mkcb(err){ 
	        mkdirs( makepath, finalcb ); 
	    };

	    function finalcb(err){
	        var filestream = fs.createWriteStream( options.filename );

	        filestream.on('error', function(err2){console.log(err2 + "file missing, creating")});

	        wrapPipe.pipe(filestream);
	    };      

	    return wrapPipe;
	  },

	_translateJSONRule: function (rule) {
	  	var rule = rule.replace("]", ""),
	  	   rules = rule.split(/\.|\[/),
	  	   i = -1;

	  	rules.forEach(function(me) {
	  		if (me === "*")
	  			rules[++i] = true;
	  		else if (!isNaN(me))
	  			rules[++i] = function(a){ return a === parseInt(me) };
	  	});

	  	return rules;
	  },

	_translateXMLRule: function (rule){
	    //console.log("_translateXMLRule");
	    var rules = rule.split('.'),
	        selector;
	    rules.filter(function(rule){
	      if( ~rule.indexOf("[") || ~rule.indexOf("]") || !isNaN(rule) || rule === "*" )
	        return false;
	      else
	        return true;
	    });
	  //  return rules;
	    selector = rules.join(" > ");
	    return 'endElement: ' + selector;
	  }
}

	    var retries = 0;
