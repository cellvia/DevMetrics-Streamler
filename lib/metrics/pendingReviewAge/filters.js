var util = require("util");

module.exports = function(streamler){

  var through2 = streamler.through2;

  /************FILTERS********************/
  streamler
    .addFilter('tickets', function(){
      return through2.call(this, function(data){
        this.emit("data", data);
      });
    })
    .addFilter('timeReviewToTest', function(){
      return through2.call(this, function(ticket){
        var needsReview = false,
          readyForTest = false,
          events = ticket.events ? JSON.parse(ticket.events) : false,
          exclude,
          author, 
          checkauthor;

        for(var n=0, len = events.length; len && n < len; n++){
          if( !events[n] || !events[n].sChanges ) continue;
          status = events[n].sChanges.match( /Status changed from '.*?' to '(.*?)'/ );
          if( !status || !status.length ) continue;
          var statusfirst = status[1].toLowerCase();
          if( ~statusfirst.indexOf("duplicate")
            || ~statusfirst.indexOf("already exists")
            || ~statusfirst.indexOf("won't")
            || ~statusfirst.indexOf("won't implement")
            || ~statusfirst.indexOf("won't fix")
            || ~statusfirst.indexOf("postponed")
            || ~statusfirst.indexOf("responded")
            || ~statusfirst.indexOf("by design")
            || ~statusfirst.indexOf("not reproducible")
          ){
            exclude = true;
          } 
          if( !needsReview && !readyForTest && status[1] === "Resolved (Needs Review)" ){
            needsReview = +new Date(events[n].dt);
            checkauthor = events[n].ixPerson;
          }
          if( ~statusfirst.indexOf("ready for test") || ~statusfirst.indexOf("closed") || ~statusfirst.indexOf("ready for merge") ){
            readyForTest = +new Date(events[n].dt);
            if(checkauthor === events[n].ixPerson) author = true;
            break;
          }
          /*if(!readyForTest && events[n].evt == 6){
            if(author !== events[n].ixPerson) author = false;
          }*/            
        }

        if( author ){
          ticket.reviewToTest = "DUPLICATE AUTHOR";
        }else if( exclude || (!ticket.dtClosed && ( (!needsReview && !readyForTest) /*|| (needsReview && !readyForTest)*/ ) ) ){
          ticket.reviewToTest = "OPEN OR N/A";
        }else if( /*readyForTest &&*/ needsReview) {
          if (!readyForTest && ticket.dtClosed) readyForTest = ticket.dtClosed;
          readyForTest = readyForTest || +new Date();
          ticket.reviewToTest = ( readyForTest - needsReview ) / 1000 / 60 / 60 / 24;
          if(ticket.reviewToTest <= 0) ticket.reviewToTest = "INVALID";
          //ticket.rawReviewToTest = readyForTest - needsReview;
        }else {
          ticket.reviewToTest = "INVALID";        
        }
        this.emit("data", ticket);
      });
    })
    .addFilter( 'accumulateMap', function(){
      return through2.call(this, function(ticket){
        var id = ticket.ixFixFor,
            val = ticket.reviewToTest,
            accum = this.root.avgs[id];
        if(!accum)
          accum = this.root.avgs[id] = {  pendingReviewValids: 0,
                                          pendingReviewInvalids: 0,
                                          pendingReviewDupAuthor: 0,
                                          pendingReviewNA: 0,
                                          pendingReviewTotal: 0,
                                          pendingReviewAvg: 0 };
        if( !isNaN(val)    /*if is a number, add to the running average*/
            || val < 90   /*if is greater than 60 days, DONT to the running average*/
            //|| val > .001 /*if is less than .001 (less than 1.5 minutes age) , DONT add to the running average*/ 
        ){
          accum.pendingReviewTotal += parseFloat(val);
          accum.pendingReviewAvg = accum.pendingReviewTotal / ++accum.pendingReviewValids;
        }else if(val === "INVALID") {
          accum.pendingReviewInvalids++;
        }else if(val === "DUPLICATE AUTHOR") {
          accum.pendingReviewDupAuthor++;
        }else{
          accum.pendingReviewNA++;                   
        }
        this.emit("data", ticket);
      });
    })
    .addFilter('milestones', function(){
      return through2.call(this, function(milestone){
        streamler.merge( milestone, { pendingReviewAvg: 0 } );
        this.emit("data", streamler.extend( milestone, this.root.avgs[milestone.ixFixFor] ) );
      });
    });

}
