var util = require("util"),
    defaults = {
      totalTickets: 0,
      openTickets: 0,
      closedTickets: 0,
      percentOpen: 0,
      percentClosed: 0,
      unclosedBugs: 0,
      unresolvedBugs: 0,
      totalBugs: 0,
      closedBugs: 0,
      percentBugsOpen: 0,
      percentBugsClosed: 0,
      percentOpen: 0,
      percentClosed: 0,      
      loadDate: new Date()
    };


module.exports = function(streamler){

  var through2 = streamler.through2;

  /************FILTERS********************/
  streamler
    .addFilter('milestones', function(){
      return through2.call(this, function(milestone){
        this.emit("data", streamler.merge( milestone, defaults ) );
      });
    })
    .addFilter( 'accumulateToMilestone', function(){
      return through2.call(this, function(ticket){
        var mile = this.root.milestone;
        mile.totalTickets++;
        if( ticket.fOpen === 'true'){
          mile.openTickets++;
          if(ticket.sCategory === 'Bug'){
              mile.totalBugs++
              mile.unclosedBugs++;
              if (!~ticket.sStatus.toLowerCase().indexOf("resolved")) mile.unresolvedBugs++;         
          }
        } else {
          mile.closedTickets++;
          if(ticket.sCategory === 'Bug'){
              mile.totalBugs++;
              mile.closedBugs++;          
          }
        }
        this.emit("data", ticket);
      }, function(){
        var milestone = this.root.milestone;
        milestone.percentOpen = ( milestone.openTickets / milestone.totalTickets ) * 100 || 0;
        milestone.percentClosed = ( milestone.closedTickets / milestone.totalTickets ) * 100 || 0;        
        milestone.percentBugsOpen = ( milestone.unclosedBugs / milestone.totalBugs ) * 100 || 0;
        milestone.percentBugsClosed = ( milestone.closedBugs / milestone.totalBugs ) * 100 || 0; 
        this.emit("end");
      });
    });

}
