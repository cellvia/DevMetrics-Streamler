
module.exports = function(streamler){

  var through2 = streamler.through2;

  /************FILTERS********************/
  streamler
    .addFilter( 'accumPersons', function(){
      return through2.call(this, function(ixPerson){
        this.root.ixPersons.push(ixPerson);
        this.emit("data", ixPerson);
      });
    })
    .addFilter('tickets', function(){
      return through2.call(this, function(ticket){
        var status = ticket.sStatus.toLowerCase();
        if( ~status.indexOf("duplicate")
  		    || ~status.indexOf("already exists")
    			|| ~status.indexOf("won't")
    			|| ~status.indexOf("won't implement")
    			|| ~status.indexOf("won't fix")
    			|| ~status.indexOf("postponed")
    			|| ~status.indexOf("responded")
    			|| ~status.indexOf("by design")
    			|| ~status.indexOf("not reproducible")){
          return; 
        } else if(ticket.ixProject == 3) {// CCC
          //skip branch or path ticket that is not a trunk to the milestone == sFixFor
          var title = ticket.sTitle.toLowerCase(),
              milestoneText = ticket.sFixFor.toLowerCase(),
              mPos = milestoneText.indexOf("(");
          if(~mPos)
            milestoneText = milestoneText.substring(0, mPos).trim();        
          if( ( ( ~title.indexOf("branch") || ~title.indexOf("patch") ) 
            && !~title.indexOf("trunk") )
            || ( ~title.indexOf("trunk") && !~title.indexOf(milestoneText)) ){
            return
          }
        }
        this.emit("data", ticket);
      });
    })

    .addFilter( 'accumulateMap', function( options ){
      return through2.call(this, function(ticket){
        var accum = this.root.accumulator[ticket.ixFixFor];
        if(!accum) accum = this.root.accumulator[ticket.ixFixFor] = { validQAReturns: 0 };
        var events = ticket.events ? JSON.parse(ticket.events).reverse() : false;
        for(var n=0, len = events.length; len && n < len; n++){
          if( !events[n] || !events[n].sVerb ) continue;
          if( events[n].evt == 4 || ~events[n].sVerb.toLowerCase().indexOf('reactivate') ){ 
            //keeping this for possible future use, it looks at next event to see if its a resolved
            //if(events[n - 1] && (events[n - 1].evt == 14 || ~events[n - 1].sVerb.toLowerCase().indexOf( 'resolve' )) ) break;
            var key = 'fogbugz:ticket:' + ticket.ixBug,
                ixPersons = options.ixPersons;
            if( ~ixPersons.indexOf(+events[n].ixPerson) ){
              accum.validQAReturns++;
              this.streamler.client.sadd('fogbugz:fixfor:' + ticket.ixFixFor + ':validQAReturns', key);
            } 
          };
        }
        this.emit("data", ticket);
      });
    })
    .addFilter('milestones', function(){
      return through2.call(this, function(milestone){
        streamler.merge( milestone, { validQAReturns: 0 } );
        var updatemile = this.root.accumulator[milestone.ixFixFor];
        if( updatemile )
          this.emit("data", streamler.extend( milestone, updatemile ) );
      });
    });

}
