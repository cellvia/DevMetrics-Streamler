var Stream = require('stream').Stream,
    util = require('util');

//throughway constructor for this streamler instance
module.exports = function (write, end, error) {

    write = write || function (data) { this.emit('data', data) }
    end = end || function () { this.emit('end') }

    var ended = false, destroyed = false
    var stream = new Stream(), buffer = []
    stream.buffer = buffer
    stream.readable = stream.writable = true
    stream.paused = false  
    stream.write = function (data) {
      if(!data){ 
        this.emit('data'); 
      }else{
        write.call(this, data)
      }
      return !stream.paused
    }
    
    function drain() {
      while(buffer.length && !stream.paused) {
        var data = buffer.shift()
        if(null === data)
          return stream.emit('end')
        else
          stream.emit('data', data)
      }
    }

    stream.queue = function (data) {
      buffer.push(data)
      drain()
    }

    //this will be registered as the first 'end' listener
    //must call destroy next tick, to make sure we're after any
    //stream piped from here. 
    //this is only a problem if end is not emitted synchronously.
    //a nicer way to do this is to make sure this is the last listener for 'end'


    stream.on('end', function () {
      stream.readable = false
      if(!stream.writable)
        process.nextTick(function () {
          stream.destroy()
        })
    })

    function _end () {
      stream.writable = false
      end.call(stream)
      if(!stream.readable)
        stream.destroy()
    }

    stream.end = function (data) {
      if(ended) return 
      //this breaks, because pipe doesn't check writable before calling end.
      //throw new Error('cannot call end twice')
      ended = true
      if(arguments.length) stream.write(data)
      if(!buffer.length) _end()
    }

    stream.destroy = function () {
      if(destroyed) return
      destroyed = true
      ended = true
      buffer.length = 0
      stream.writable = stream.readable = false
      stream.emit('close')
    }

    stream.pause = function () {
      if(stream.paused) return
      stream.paused = true
      stream.emit('pause')
    }
    stream.wait = function () {
      if(stream.paused) return
      stream.paused = true
  //    stream.emit('pause')
    }
    
    stream.resume = function () {
      if(stream.paused) {
        stream.paused = false
      }
      drain()
      //may have become paused again,
      //as drain emits 'data'.
      if(!stream.paused)
        stream.emit('drain')
    }


    /**********ADDED BY BRANDON*************/
    var streamler = stream.streamler = this.streamler,
        metric = stream.metric = this.metric,
        channelname = stream.channelname = this.channelname,
        parentmap = stream.parentmap = this.parentmap,
        routemap = stream.routemap = this.routemap,
        root = stream.root = this.root ? streamler.merge(this.root, {count:0}) : {count:0},
        _start = stream._start = this._start;


    if(error && error.length){
      error.forEach(function(err){
        stream.on("error", err);
      });
    }

    stream.setMaxListeners(0);

    stream.filter = stream.filt = stream.link = function(type, options){
      var ret;
      if( options && options.hasOwnProperty("condition") && !options.condition )
        ret = this;
      else if( this.streamler.filters[metric] && typeof this.streamler.filters[metric][type] === "function" )
        ret = this.pipe( this.streamler.filters[metric][type].call( this, options ) );
      else if( typeof this.streamler.filters.global[type] === "function" )
        ret = this.pipe( this.streamler.filters.global[type].call( this, options ) );
      else {
        console.log("broken filter! metric not correct OR filter doesnt exist "+this.metric+type); process.exit();
      }
      return ret;
    }

    stream.dumper = stream.dump = function(type, options){
      if( options && options.hasOwnProperty("condition") && !options.condition )
        return this;
      else if( streamler.dumpers[metric] && typeof streamler.dumpers[metric][type] === "function" )
        this.pipe( streamler.dumpers[metric][type].call( this, options ) );
      else if( typeof streamler.dumpers.global[type] === "function" )
        this.pipe( streamler.dumpers.global[type].call( this, options ) );
      else {
        console.log("broken dumper!"+metric+type); process.exit();
      }
      return this;
    }

    stream.done = function(options){
      this.pipe( streamler.channelDone.apply(this, arguments) );
    }

    stream.convert = function( toconvert ){
      var me = toconvert;
      me.streamler = streamler;
      me.channelname = channelname;
      me.routemap = routemap;
      me.root = root;
      me.metric = metric;
      me._start = _start;
      toconvert.filter = toconvert.filt = toconvert.link = stream.filt.bind( me );
      toconvert.dumper = toconvert.dump = stream.dump.bind( me );
      toconvert.done = stream.done.bind( me );
      return me;
    }

    return stream
}